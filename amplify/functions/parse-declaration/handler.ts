import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import {
  NLU_PROFILE,
  USE_MOCK,
  converseText,
  extractJson,
  log,
} from "../_shared/bedrock";
import { heuristicParse } from "../_shared/fallbacks";
console.log("HANDLER_REV=3");

const client = dataClient();

const SYSTEM = `You parse informal tontine payment declarations (French, English, Wolof-inflected French).
Return ONLY valid JSON, no markdown: {"memberId": "<best match id or null>", "memberName": "<matched name or empty string>", "amount": <integer FCFA>, "recipientName": "<matched name or empty string>", "confidence": <0..1>, "rawTextEn": "<English translation of the raw declaration>"}
Rules: extract first plausible amount ("20k","vingt mille","20000" -> 20000); amounts <1000 are multiplied by 1000; confidence 0.95 exact amount+name, 0.8 partial, 0.5 guess.
STRICT: match names ONLY against the known members list. If the payer is not a known member, return memberId null, memberName "" and confidence <= 0.4 — never invent or substitute another member. Same for recipientName: matched name or "".`;

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
    return heuristicParse(text, members, group.contributionAmount, openCycle?.recipientName ?? "");
  }
  try {
    const prompt = `Known members: ${JSON.stringify(members)}. Group: ${group.name}, standard contribution ${group.contributionAmount} FCFA, current recipient ${openCycle?.recipientName ?? "?"}. Declaration: """${text}"""`;
    const raw = await converseText(NLU_PROFILE, SYSTEM, prompt, 800);
    const p = extractJson(raw) as Record<string, unknown>;
    if (typeof p.amount !== "number") throw new Error("no-amount");
    // Server-side membership guard: Bedrock must never resolve a payer or
    // recipient who is not in the group. Unknown -> empty (UI blocks + offers
    // to add the person), never another member's identity.
    const byId = new Map(members.map((m) => [m.id, m]));
    const byName = new Map(members.map((m) => [m.name.toLowerCase(), m]));
    const bedId = p.memberId as string | null;
    const bedName = ((p.memberName as string) ?? "").trim();
    const memberHit =
      (bedId && byId.get(bedId)) ??
      (bedName ? byName.get(bedName.toLowerCase()) : undefined) ??
      null;
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
    return heuristicParse(text, members, group.contributionAmount, openCycle?.recipientName ?? "");
  }
};
