import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import { NLU_PROFILE, USE_MOCK, converseText, extractJson, log } from "../_shared/bedrock";
import { dedupeKey } from "../_shared/fallbacks";
import { applyLateEvent } from "../_shared/trust";
import { detectLocale } from "../_shared/locale";
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
- Pages: Dashboard (cycle progress, contributions list with OK/Late/Pending badges, emergency fund, audio digest, past cycles); Groups (manage several groups, switch active group, archive); Declare (text tab: write e.g. "I paid 20000 for Cheikh" — AI extracts amount + recipient; receipt tab: upload a Wave/Orange Money/MTN screenshot — OCR extracts amount, transaction ID, date); Members (trust scores, punctuality, AI rotation order); Alerts (late-payment nudges, anomaly detection for recurring lates, tour-swap proposals, emergency-fund cover; accept/mark-resolved/nudge actions); Export (CSV ledger + printable preview); New group (name, dates, amount, frequency, members with email/phone + late history + seniority, AI rotation preview, confirmation).
- Emergency fund (Tontine Flex): optional reserve covering a critical late payment temporarily, repaid over ~2 cycles.
- AI rotation: ranks by trust score, then late history, then seniority; reliable profiles early, recurring lates later. First cycle with no history = provisional lottery order.
- Audio digest: reads the cycle summary aloud (Polly-style), inclusive for low-literacy members.
- Standard demo figures: 20,000 FCFA/month, 12 members, 240,000 FCFA expected per cycle.
- Help with: how to declare, read a receipt, understand a late/alert, emergency fund, rotation order, export, audio, manage groups, create an account, log in.
- Out of scope (decline politely + redirect to a platform topic): anything unrelated to TontinePilot (general knowledge, code, other products). Never invent members, amounts, or pages that don't exist above. Never handle real money — tracking only.`;

const EMAIL_TOOL = {
  toolSpec: {
    name: "send_member_email",
    description:
      "Send an email to a group member. Use ONLY when the user explicitly asks to contact, nudge, or remind a member (e.g. 'ask X to pay now', 'remind Y they are late', 'send a message to Z'). Recipient must be a member first/last name or email from the conversation.",
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
          content: [{ toolResult: { toolUseId: toolUse.toolUseId ?? "tool-1", content: [{ text: outcome }] } }],
        },
      ],
      inferenceConfig: { maxTokens: 400, temperature: 0.3 },
    })
  );
  const t2 = (second.output?.message?.content ?? []).find((b) => "text" in b);
  return t2 && "text" in t2 ? (t2.text ?? "") : outcome;
}

async function executeEmailTool(
  toolUseId: string,
  input: { recipient?: string; kind?: string; subject?: string; body?: string },
  locale: string,
  sub: string | null
): Promise<string> {
  void toolUseId;
  if (!sub) return "ERROR: caller identity unknown, email not sent.";
  const needle = (input.recipient ?? "").trim().toLowerCase();
  if (!needle) return "ERROR: no recipient given, email not sent.";
  // Scope: members of the caller's own groups only.
  const groups = (
    await client.models.Group.list({ filter: { owner: { eq: sub } } })
  ).data;
  let match: { id: string; name: string; email: string; groupId: string; groupName: string } | null = null;
  for (const g of groups) {
    const members = (
      await client.models.Member.list({ filter: { groupId: { eq: g.id } } })
    ).data;
    for (const m of members) {
      const name = (m.name ?? "").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      if (!match && (email === needle || (needle.length > 2 && name.includes(needle)))) {
        match = { id: m.id, name: m.name, email: m.email, groupId: g.id, groupName: g.name };
      }
    }
    if (match) break;
  }
  if (!match) return `ERROR: no member matching "${input.recipient}" in your groups, email not sent.`;
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(match.email)) {
    return `ERROR: ${match.name} has no valid email on file, email not sent.`;
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
      if (existing.length === 0) {
        await client.models.Alert.create({
          groupId: match.groupId, cycleId, memberId: match.id, memberName: match.name,
          type: "LATE_PAYMENT",
          message: input.body ?? `Rappel pour ${match.name}`,
          messageEn: input.body ?? `Reminder for ${match.name}`,
          createdAt: new Date().toISOString(), resolved: false, dedupeKey: key,
        });
        await applyLateEvent(client.models, match.id).catch(() => null);
      }
      const mail = reminderHtml({
        memberName: match.name, groupName: match.groupName,
        amount: group?.contributionAmount ?? 20000,
        cycleLabel: `cycle ${group?.currentCycleIndex ?? 1}`,
        late: true, appUrl, logoUrl,
      });
      await sendHtml(match.email, mail.subject, mail.html, mail.text);
      return `OK: reminder email sent to ${match.name} (${match.email}); trust score recalculated.`;
    }
    const mail = memberMessageHtml({
      memberName: match.name, groupName: match.groupName,
      subject: input.subject ?? (locale === "en" ? "Message from your group admin" : "Message de ton admin"),
      message: input.body ?? "", appUrl, logoUrl,
    });
    await sendHtml(match.email, mail.subject, mail.html, mail.text);
    return `OK: message email sent to ${match.name} (${match.email}).`;
  } catch (err) {
    return `ERROR: send failed (${(err as Error)?.message}).`;
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

