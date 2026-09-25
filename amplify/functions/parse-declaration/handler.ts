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

const client = dataClient();

const SYSTEM = `You parse informal tontine payment declarations (French, English, Wolof-inflected French).
Return ONLY valid JSON, no markdown: {"memberId": "<best match id or null>", "memberName": "<as written or matched>", "amount": <integer FCFA>, "recipientName": "<matched or current recipient>", "confidence": <0..1>, "rawTextEn": "<English translation of the raw declaration>"}
Rules: extract first plausible amount ("20k","vingt mille","20000" -> 20000); amounts <1000 are multiplied by 1000; confidence 0.95 exact amount+name, 0.8 partial, 0.5 guess.`;

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
    return {
      memberId: (p.memberId as string) ?? null,
      memberName: (p.memberName as string) ?? text.slice(0, 40),
      amount: Math.round(p.amount as number),
      recipientName: (p.recipientName as string) ?? openCycle?.recipientName ?? "",
      confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
      rawTextEn: (p.rawTextEn as string) ?? text,
    };
  } catch (err) {
    log(`FALLBACK: Bedrock failed (${(err as Error)?.message}), heuristic parse`);
    return heuristicParse(text, members, group.contributionAmount, openCycle?.recipientName ?? "");
  }
};
