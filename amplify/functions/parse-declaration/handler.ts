import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import {
  NLU_PROFILE,
  USE_MOCK,
  conversePrompt,
  converseText,
  extractJson,
  log,
} from "../_shared/bedrock";
import { heuristicParse } from "../_shared/fallbacks";
console.log("HANDLER_REV=3");

// Managed few-shot prompt (notebooks/tontine-fewshot.ipynb): when set, the
// versioned prompt runs instead of the inline text — same contract, same
// membership guard below. Unset = current inline behavior.
const DECLARATION_PROMPT_ARN = process.env.DECLARATION_PROMPT_ARN ?? "";

const client = dataClient();

const SYSTEM = `You parse informal tontine payment declarations (French, English, Wolof-inflected French).
Return ONLY valid JSON, no markdown: {"memberId": "<best match id or null>", "memberName": "<matched name or empty string>", "amount": <integer FCFA>, "recipientName": "<matched name or empty string>", "confidence": <0..1>, "rawTextEn": "<English translation of the raw declaration>"}
Rules: extract first plausible amount ("20k","vingt mille","20000" -> 20000); amounts <1000 are multiplied by 1000; confidence 0.95 exact amount+name, 0.8 partial, 0.5 guess.
STRICT: match names ONLY against the known members list. If no named person matches any member, return memberId null, memberName "" and confidence <= 0.4 — never invent or substitute another member. When the declaration names a known member as beneficiary ("I paid 20000 for Awa") and no other payer is identifiable, that member IS the payer of record. First distinct named member = payer, second distinct named member = recipient.`;

export const handler: Handler = async (event) => {
  // AppSync custom-query event: { arguments: { text, groupId } }
  const args = (event as { arguments?: { text?: string; groupId?: string } }).arguments ?? {};
  const text = (args.text ?? "").slice(0, 500);
  const groupId = args.groupId ?? "";
  if (!text.trim() || !groupId) throw new Error("VALIDATION: text and groupId required");

  // Need group context (members, standard amount, recipient) for both paths.
  const group = (await client.models.Group.get({ id: groupId })).data;
  if (!group) throw new Error("VALIDATION: unknown group");
  const memberRows = (
    await client.models.Member.list({ filter: { groupId: { eq: groupId } } })
  ).data;
  const members = memberRows.map((m) => ({ id: m.id, name: m.name }));
  const openCycle = (
    await client.models.Cycle.list({ filter: { groupId: { eq: groupId }, status: { eq: "OPEN" } } })
  ).data[0];

  if (USE_MOCK) {
    log("FALLBACK: USE_MOCK=true, heuristic parse");
    return heuristicParse(text, members, group.contributionAmount, openCycle?.recipientName ?? "", group.currency);
  }
  try {
    let p: Record<string, unknown>;
    if (DECLARATION_PROMPT_ARN) {
      log("MANAGED_PROMPT: invoking versioned prompt");
      const rendered = await conversePrompt(
        DECLARATION_PROMPT_ARN,
        {
          members: JSON.stringify(members),
          standard: String(group.contributionAmount),
          recipient: openCycle?.recipientName ?? "",
          declaration: text,
        },
        800
      );
      p = extractJson(rendered) as Record<string, unknown>;
    } else {
      const currency = group.currency === "USD" ? "USD" : "FCFA";
      const prompt = `Known members: ${JSON.stringify(members)}. Group: ${group.name}, standard contribution ${group.contributionAmount} ${currency}, current recipient ${openCycle?.recipientName ?? "?"}.${currency === "USD" ? " Amounts are in USD — keep small amounts as-is, never apply any ×1000 rule." : ""} Declaration: """${text}"""`;
      const raw = await converseText(NLU_PROFILE, SYSTEM, prompt, 800);
      p = extractJson(raw) as Record<string, unknown>;
    }
    if (typeof p.amount !== "number") throw new Error("no-amount");
    // Server-side membership guard: Bedrock must never resolve a payer or
    // recipient who is not in the group. Unknown -> empty (UI blocks + offers
    // to add the person), never another member's identity.
    const byId = new Map(members.map((m) => [m.id, m]));
    const byName = new Map(members.map((m) => [m.name.toLowerCase(), m]));
    const bedId = (p.memberId as string | null) ?? null;
    const bedName = ((p.memberName as string) ?? "").trim().toLowerCase();
    const memberHit =
      (bedId ? (byId.get(bedId) ?? null) : null) ??
      (bedName ? (byName.get(bedName) ?? null) : null);
    const bedRec = ((p.recipientName as string) ?? "").trim();
    const cycleRec = openCycle?.recipientName ?? "";
    const recipientHit =
      !bedRec || bedRec.toLowerCase() === cycleRec.toLowerCase()
        ? cycleRec
        : (byName.get(bedRec.toLowerCase())?.name ?? "");
    return {
      memberId: memberHit?.id ?? null,
      memberName: memberHit?.name ?? "",
      amount: Math.round(p.amount as number),
      recipientName: recipientHit,
      confidence:
        typeof p.confidence === "number" ? p.confidence : memberHit ? 0.5 : 0.35,
      rawTextEn: (p.rawTextEn as string) ?? text,
    };
  } catch (err) {
    log(`FALLBACK: Bedrock failed (${(err as Error)?.message}), heuristic parse`);
    return heuristicParse(text, members, group.contributionAmount, openCycle?.recipientName ?? "", group.currency);
  }
};
