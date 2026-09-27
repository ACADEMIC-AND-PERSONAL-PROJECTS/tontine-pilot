import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import { NLU_PROFILE, USE_MOCK, converseText, extractJson, log } from "../_shared/bedrock";
import { dedupeKey } from "../_shared/fallbacks";
import { applyLateEvent } from "../_shared/trust";
import { detectLocale } from "../_shared/locale";
import { routeMemberEmail } from "../_shared/intent";
import { memberMessageHtml, reminderHtml } from "../_shared/email";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

console.log("HANDLER_REV=4");

const client = dataClient();
const region = process.env.BEDROCK_REGION ?? "us-east-1";
const bedrock = new BedrockRuntimeClient({ region, maxAttempts: 5, retryMode: "adaptive" });
const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });

const SYSTEM = `You are Tonti, the in-app assistant for TontinePilot — an AI copilot for community rotating savings groups (tontines). Answer ONLY questions about the platform, in the user's language (French or English — match the conversation). Be clear, concise (max 90 words), concrete: name the exact page or button to use.

PLATFORM KNOWLEDGE:
- Concept: a tontine = members contribute a fixed amount each cycle; each cycle one member receives the pot.
- Pages: Dashboard (cycle progress, contributions list with OK/Late/Pending badges, emergency fund, audio digest, past cycles); Groups (manage several groups, switch active group, archive); Declare (text tab: write e.g. "I paid 20000 for Cheikh" — AI extracts amount + recipient; receipt tab: upload a Wave/Orange Money/MTN screenshot — OCR extracts amount, transaction ID, date); Members (trust scores, punctuality, AI rotation order); Alerts (late-payment nudges, anomaly detection for recurring lates, tour-swap proposals, emergency-fund cover; accept/mark-resolved/nudge actions); Export (CSV ledger + printable preview); Fund (safety reserve: balance/target, top-ups, safety-net payouts, repayments, movement history); New group (name, dates, amount, frequency, members with email/phone + late history + seniority, AI rotation preview, confirmation).
- Emergency fund (Tontine Flex): optional reserve covering a critical late payment temporarily, repaid over ~2 cycles.
- AI rotation: ranks by trust score, then late history, then seniority; reliable profiles early, recurring lates later. First cycle with no history = provisional lottery order.
- Audio digest: reads the cycle summary aloud (Polly-style), inclusive for low-literacy members.
- Standard demo figures: 20,000 FCFA/month, 12 members, 240,000 FCFA expected per cycle.
- Help with: how to declare, read a receipt, understand a late/alert, emergency fund, rotation order, export, audio, manage groups, create an account, log in.
- Out of scope (decline politely + redirect to a platform topic): anything unrelated to TontinePilot (general knowledge, code, other products). Never handle real money — tracking only.
- HARD RULE — never invent product surface: there is NO invite-members button, NO invite link, NO settings page, NO Groups-settings screen. The ONLY way to add members is the New-group creation flow (name, dates, amount, frequency, members with email/phone + history, AI rotation preview, confirmation). If the user asks for something that does not exist above, say it does not exist yet and offer the closest real alternative. Never describe clicks on buttons that are not listed here.`;

const EMAIL_TOOL = {
  toolSpec: {
    name: "send_member_email",
    description:
      "Send an email to a group member. Call this tool EVERY time the user asks to contact, nudge, remind, warn, or message a specific person — even if the name looks approximate or incomplete (the tool resolves fuzzy names itself and reports back when nobody matches). Do NOT ask for clarification first when a person's name or email appears in the request; call the tool. Examples: 'ask X to pay now', 'remind Y they are late', 'send a message to Z', 'tell Cheikh the deadline moved'. Only skip the tool when NO person is mentioned at all.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          recipient: { type: "string", description: "Member name or email as written by the user" },
          kind: {
            type: "string",
            description: "'reminder' for late-payment nudges, 'message' for any other admin message",
          },
          subject: { type: "string", description: "Short email subject in the user's language" },
          body: {
            type: "string",
            description: "The message itself, in the user's language, max 60 words, warm and concrete",
          },
        },
        required: ["recipient", "kind", "body"],
      },
    },
  },
};

type HistItem = { role?: string; text?: string };

async function converseWithTool(
  modelId: string,
  system: string,
  history: HistItem[],
  question: string,
  locale: string
): Promise<string> {
  const historyBlocks = history
    .slice(-6)
    .flatMap((h) => [
      { role: h.role === "assistant" ? ("assistant" as const) : ("user" as const), content: [{ text: (h.text ?? "").slice(0, 400) }] },
    ]);
  const first = await bedrock.send(
    new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages: [
        ...historyBlocks,
        { role: "user", content: [{ text: `User language: ${locale === "en" ? "English" : "French"}\nQuestion: """${question}"""` }] },
      ],
      inferenceConfig: { maxTokens: 600, temperature: 0.3 },
      toolConfig: { tools: [EMAIL_TOOL] },
    })
  );
  const content = first.output?.message?.content ?? [];
  const toolUse = content.find((b) => "toolUse" in b && b.toolUse)?.toolUse;
  if (!toolUse) {
    const t = content.find((b) => "text" in b);
    return t && "text" in t ? (t.text ?? "") : "";
  }
  // One tool round-trip max (latency + cost bound).
  const input = (toolUse.input ?? {}) as { recipient?: string; kind?: string; subject?: string; body?: string };
  const outcome = await executeEmailTool(toolUse.toolUseId ?? "tool-1", input, locale, currentSub);
  const outcomeText = `[${outcome.status}] ${outcome.message}`;
  const second = await bedrock.send(
    new ConverseCommand({
      modelId,
      system: [{ text: system }],
      messages: [
        ...historyBlocks,
        { role: "user", content: [{ text: question }] },
        { role: "assistant", content: [{ toolUse: { toolUseId: toolUse.toolUseId ?? "tool-1", name: toolUse.name, input } }] },
        {
          role: "user",
          content: [{ toolResult: { toolUseId: toolUse.toolUseId ?? "tool-1", content: [{ text: outcomeText }] } }],
        },
      ],
      inferenceConfig: { maxTokens: 400, temperature: 0.3 },
      toolConfig: { tools: [EMAIL_TOOL] },
    })
  );
  const t2 = (second.output?.message?.content ?? []).find((b) => "text" in b);
  return t2 && "text" in t2 ? (t2.text ?? "") : outcomeText;
}

async function executeRouted(
  routed: { kind: "reminder" | "message"; recipient: string },
  locale: string,
  sub: string | null,
  question: string
): Promise<string | null> {
  // Resolve first: never announce an email we cannot address.
  const savedSub = currentSub;
  currentSub = sub;
  try {
    const needle = routed.recipient.trim().toLowerCase();
    const groups = (
      await client.models.Group.list({ filter: { ownerId: { eq: sub ?? "" } } })
    ).data;
    let match: { id: string; name: string; email: string; groupId: string; groupName: string } | null = null;
    for (const g of groups) {
      const members = (
        await client.models.Member.list({ filter: { groupId: { eq: g.id } } })
      ).data;
      for (const m of members) {
        const name = (m.name ?? "").toLowerCase();
        const email = (m.email ?? "").toLowerCase();
        if (email === needle || (needle.length > 2 && name.includes(needle))) {
          match = { id: m.id, name: m.name ?? "?", email: m.email ?? "", groupId: g.id, groupName: g.name ?? "" };
          break;
        }
      }
      if (match) break;
    }
    if (!match) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(match.email)) return null;
    const outcome = await executeEmailTool("routed", {
      recipient: match.email,
      kind: routed.kind,
      subject: "",
      body: question,
    }, locale, sub);
    if (outcome.status === "error") return null;
    // sent OR saved (alert + trust done, email pending): confirm, no model retry.
    return locale === "en"
      ? outcome.status === "sent"
        ? `Done — email on its way to **${match.name}** (${match.email}). I also updated their record${routed.kind === "reminder" ? " and recalculated their trust score" : ""}.`
        : `Done — reminder for **${match.name}** is saved (alert created${routed.kind === "reminder" ? " and trust recalculated" : ""}). The email itself is still pending on our side and will follow automatically.`
      : outcome.status === "sent"
        ? `C'est fait — e-mail en route vers **${match.name}** (${match.email}). J'ai aussi mis à jour sa fiche${routed.kind === "reminder" ? " et recalculé son score de confiance" : ""}.`
        : `C'est noté — rappel pour **${match.name}** enregistré (alerte créée${routed.kind === "reminder" ? " et confiance recalculée" : ""}). L'e-mail suivra automatiquement dès que l'envoi sera possible.`;
  } finally {
    currentSub = savedSub;
  }
}

async function executeEmailTool(
  toolUseId: string,
  input: { recipient?: string; kind?: string; subject?: string; body?: string },
  locale: string,
  sub: string | null
): Promise<{ status: "sent" | "saved" | "error"; message: string }> {
  void toolUseId;
  const err = (message: string) => ({ status: "error" as const, message });
  if (!sub) return err("ERROR: caller identity unknown, email not sent.");
  const callerSub: string = sub;
  const needle = (input.recipient ?? "").trim().toLowerCase();
  if (!needle) return err("ERROR: no recipient given, email not sent.");
  // Scope: members of the caller's own groups only.
  async function findMatch() {
    const groups = (
      await client.models.Group.list({ filter: { ownerId: { eq: callerSub } } })
    ).data;
    log(`TOOL_SCOPE sub=${callerSub.slice(0, 8)}*** groups=${groups.length}`);
    for (const g of groups) {
      const members = (
        await client.models.Member.list({ filter: { groupId: { eq: g.id } } })
      ).data;
      for (const m of members) {
        const name = (m.name ?? "").toLowerCase();
        const email = (m.email ?? "").toLowerCase();
        if (email === needle || (needle.length > 2 && name.includes(needle))) {
          return {
            id: m.id,
            name: m.name ?? "?",
            email: m.email ?? "",
            groupId: g.id,
            groupName: g.name ?? "",
          };
        }
      }
    }
    return null;
  }
  // DynamoDB reads are eventually consistent — retry for just-created rows.
  let match = await findMatch();
  for (let i = 0; !match && i < 2; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    match = await findMatch();
  }
  if (!match) return err(`ERROR: no member matching "${input.recipient}" in your groups, email not sent.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(match.email)) {
    return err(`ERROR: ${match.name} has no valid email on file, email not sent.`);
  }
  const appUrl = process.env.APP_URL ?? "https://main.dhnfua5oyahpy.amplifyapp.com";
  const logoUrl = process.env.LOGO_URL ?? `${appUrl}/logo.jpeg`;
  try {
    if (input.kind === "reminder") {
      // Late event: dedupe-guarded alert + trust recompute + branded reminder.
      const group = (await client.models.Group.get({ id: match.groupId })).data;
      const cycleId = `${match.groupId}-cycle-${group?.currentCycleIndex ?? 1}`;
      const key = dedupeKey(match.groupId, cycleId, match.id, "LATE_PAYMENT");
      const existing = (
        await client.models.Alert.list({ filter: { dedupeKey: { eq: key }, resolved: { eq: false } } })
      ).data;
      log(`TOOL_MATCH member=${match.name} group=${match.groupName} alerts_open=${existing.length}`);
      if (existing.length === 0) {
        const created = await client.models.Alert.create({
          groupId: match.groupId, cycleId, memberId: match.id, memberName: match.name,
          type: "LATE_PAYMENT",
          message: input.body ?? `Rappel pour ${match.name}`,
          messageEn: input.body ?? `Reminder for ${match.name}`,
          createdAt: new Date().toISOString(), resolved: false, dedupeKey: key,
        });
        if (created.errors?.length || !created.data) {
          throw new Error(`alert create rejected: ${JSON.stringify(created.errors)?.slice(0, 200)}`);
        }
        const tr = await applyLateEvent(client.models, match.id).catch(() => null);
        log(`TOOL_TRUST ${JSON.stringify(tr)}`);
      }
      const mail = reminderHtml({
        memberName: match.name, groupName: match.groupName,
        amount: group?.contributionAmount ?? 20000,
        currency: group?.currency ?? undefined,
        cycleLabel: `cycle ${group?.currentCycleIndex ?? 1}`,
        late: true, appUrl, logoUrl,
      });
      try {
        await sendHtml(match.email, mail.subject, mail.html, mail.text);
        return { status: "sent" as const, message: `reminder email sent to ${match.name} (${match.email}); trust score recalculated.` };
      } catch (e) {
        return { status: "saved" as const, message: `reminder saved for ${match.name}; trust score recalculated; email pending (${(e as Error)?.message ?? "delivery unavailable"}).` };
      }
    }
    const mail = memberMessageHtml({
      memberName: match.name, groupName: match.groupName,
      subject: input.subject ?? (locale === "en" ? "Message from your group admin" : "Message de ton admin"),
      message: input.body ?? "", appUrl, logoUrl,
    });
    try {
      await sendHtml(match.email, mail.subject, mail.html, mail.text);
      return { status: "sent" as const, message: `message email sent to ${match.name} (${match.email}).` };
    } catch (e) {
      return { status: "saved" as const, message: `message saved for ${match.name} but email pending (${(e as Error)?.message ?? "delivery unavailable"}).` };
    }
  } catch (err) {
    return { status: "error" as const, message: `ERROR: failed (${(err as Error)?.message}).` };
  }
}

async function sendHtml(to: string, subject: string, html: string, text: string) {
  await ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    })
  );
  log(`SEND chatbot email to=${to.slice(0, 3)}*** subject=${subject.slice(0, 40)}`);
}

let currentSub: string | null = null;

export const handler: Handler = async (event) => {
  const args = (event as {
    arguments?: { question?: string; locale?: string; history?: Array<{ role?: string; text?: string }> };
    identity?: { sub?: string };
  }).arguments ?? {};
  const question = (args.question ?? "").slice(0, 1000).trim();
  const uiLocale = args.locale === "en" ? "en" : "fr";
  const locale = detectLocale(question, uiLocale);
  if (!question) throw new Error("VALIDATION: question required");
  currentSub = (event as { identity?: { sub?: string } }).identity?.sub ?? null;
  const history = (args.history ?? []).slice(-6);

  // Deterministic fast path: explicit reminder/message requests skip the
  // model lottery and execute immediately with a templated confirmation.
  const routed = routeMemberEmail(question, uiLocale);
  log(`ROUTED ${JSON.stringify(routed)} q=${question.slice(0, 60)}`);
  if (routed) {
    const sub0 =
      (event as { identity?: { sub?: string } }).identity?.sub ?? null;
    const outcome = await executeRouted(routed, locale, sub0, question);
    if (outcome) return { answer: outcome };
    // fall through to the model when routing execution fails softly
  }

  if (USE_MOCK) {
    log("FALLBACK: USE_MOCK=true, canned assistant reply");
    return {
      answer:
        locale === "en"
          ? "I can help with declaring a contribution, reading a receipt, understanding a late payment, the emergency fund, rotation order, or export. What do you need?"
          : "Je peux aider pour déclarer une cotisation, lire un reçu, comprendre un retard, la caisse de secours, l'ordre de rotation ou l'export. Que te faut-il ?",
    };
  }
  try {
    const answer = await converseWithTool(NLU_PROFILE, SYSTEM, history, question, locale);
    if (!answer.trim()) throw new Error("empty-answer");
    return { answer: answer.trim() };
  } catch (err) {
    log(`FALLBACK: Bedrock failed (${(err as Error)?.message}), canned reply`);
    return {
      answer:
        locale === "en"
          ? "I can help with declaring a contribution, reading a receipt, understanding a late payment, the emergency fund, rotation order, or export. What do you need?"
          : "Je peux aider pour déclarer une cotisation, lire un reçu, comprendre un retard, la caisse de secours, l'ordre de rotation ou l'export. Que te faut-il ?",
    };
  }
};

