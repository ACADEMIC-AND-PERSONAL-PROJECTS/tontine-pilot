import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import { NLU_PROFILE, USE_MOCK, converseText, log } from "../_shared/bedrock";
console.log("HANDLER_REV=3");

const client = dataClient();
void client;

const SYSTEM = `You are Tonti, the in-app assistant for TontinePilot — an AI copilot for community rotating savings groups (tontines). Answer ONLY questions about the platform, in the user's language (French or English — match the conversation). Be clear, concise (max 90 words), concrete: name the exact page or button to use.

PLATFORM KNOWLEDGE:
- Concept: a tontine = members contribute a fixed amount each cycle; each cycle one member receives the pot.
- Pages: Dashboard (cycle progress, contributions list with OK/Late/Pending badges, emergency fund, audio digest, past cycles); Groups (manage several groups, switch active group, archive); Declare (text tab: write e.g. "I paid 20000 for Cheikh" — AI extracts amount + recipient; receipt tab: upload a Wave/Orange Money/MTN screenshot — OCR extracts amount, transaction ID, date); Members (trust scores, punctuality, AI rotation order); Alerts (late-payment nudges, anomaly detection for recurring lates, tour-swap proposals, emergency-fund cover; accept/mark-resolved/nudge actions); Export (CSV ledger + printable preview); New group (name, amount, frequency, members with email/phone + late history + seniority, AI rotation preview, confirmation).
- Emergency fund (Tontine Flex): optional reserve covering a critical late payment temporarily, repaid over ~2 cycles.
- AI rotation: ranks by trust score, then late history, then seniority; reliable profiles early, recurring lates later. First cycle with no history = provisional lottery order.
- Audio digest: reads the cycle summary aloud (Polly-style), inclusive for low-literacy members.
- Standard demo figures: 20,000 FCFA/month, 12 members, 240,000 FCFA expected per cycle.
- Help with: how to declare, read a receipt, understand a late/alert, emergency fund, rotation order, export, audio, manage groups, create an account, log in.
- Out of scope (decline politely + redirect to a platform topic): anything unrelated to TontinePilot (general knowledge, code, other products). Never invent members, amounts, or pages that don't exist above. Never handle real money — tracking only.`;

export const handler: Handler = async (event) => {
  const args = (event as {
    arguments?: { question?: string; locale?: string; history?: Array<{ role?: string; text?: string }> };
  }).arguments ?? {};
  const question = (args.question ?? "").slice(0, 1000).trim();
  const locale = args.locale === "en" ? "en" : "fr";
  if (!question) throw new Error("VALIDATION: question required");
  const history = (args.history ?? [])
    .slice(-6)
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${(h.text ?? "").slice(0, 400)}`)
    .join("\n");

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
    const answer = await converseText(
      NLU_PROFILE,
      SYSTEM,
      `${history ? `Conversation so far:\n${history}\n\n` : ""}User language: ${locale === "en" ? "English" : "French"}\nQuestion: """${question}"""`,
      600
    );
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
