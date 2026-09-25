import type { Handler } from "aws-lambda";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/recommend-rotation";
import type { Schema } from "../../data/resource";
import { NLU_PROFILE, USE_MOCK, converseText, extractJson, log } from "../_shared/bedrock";
import { lottery, trustFor } from "../_shared/fallbacks";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

export const handler: Handler = async (event) => {
  const args = (event as { arguments?: { groupId?: string } }).arguments ?? {};
  if (!args.groupId) throw new Error("VALIDATION: groupId required");
  const members = (
    await client.models.Member.list({ filter: { groupId: { eq: args.groupId } } })
  ).data;
  if (members.length === 0) return { provisional: true, entries: [] };

  // Cold start: everybody at zero history -> provisional lottery, no Bedrock call.
  const cold = members.every((m) => (m.lateCount ?? 0) === 0 && (m.cyclesCompleted ?? 0) <= 1);
  if (cold) {
    log("COLD_START: provisional lottery order");
    const order = lottery(members, args.groupId);
    return {
      provisional: true,
      entries: order.map((m) => ({
        memberId: m.id,
        name: m.name,
        trustScore: trustFor(m.lateCount ?? 0, m.cyclesCompleted ?? 0),
        reason: "Ordre provisoire — tirage au sort, cycle 1.",
        reasonEn: "Provisional order — lottery draw, cycle 1.",
      })),
    };
  }

  const ranked = [...members].sort((a, b) => {
    const t = (b.trustScore ?? 0) - (a.trustScore ?? 0);
    if (t !== 0) return t;
    const l = (a.lateCount ?? 0) - (b.lateCount ?? 0);
    if (l !== 0) return l;
    return (b.cyclesCompleted ?? 0) - (a.cyclesCompleted ?? 0);
  });

  const reasonFor = (m: (typeof members)[number], i: number) => {
    const late = m.lateCount ?? 0;
    const risky = late >= 2 || (m.trustScore ?? 0) < 80;
    if (i < 2)
      return { fr: "Profil fiable — placé tôt.", en: "Reliable profile — placed early." };
    if (risky)
      return { fr: "Risque de retard — placé plus tard.", en: "Late risk — placed later." };
    return { fr: "Profil stable — milieu d'ordre.", en: "Stable profile — mid order." };
  };

  if (USE_MOCK) {
    log("FALLBACK: USE_MOCK=true, deterministic reasons");
    return {
      provisional: false,
      entries: ranked.map((m, i) => {
        const r = reasonFor(m, i);
        return { memberId: m.id, name: m.name, trustScore: m.trustScore, reason: r.fr, reasonEn: r.en };
      }),
    };
  }
  try {
    const raw = await converseText(
      NLU_PROFILE,
      "Explain each ranking in max 12 words, FR + EN. Input: ordered JSON. Output ONLY JSON: [{\"memberId\":\"...\",\"reason_fr\":\"...\",\"reason_en\":\"...\"}]",
      JSON.stringify(
        ranked.map((m) => ({ memberId: m.id, name: m.name, trust: m.trustScore, lates: m.lateCount, cycles: m.cyclesCompleted }))
      ),
      1500
    );
    const reasons = extractJson(raw) as Array<{ memberId: string; reason_fr: string; reason_en: string }>;
    const byId = new Map(reasons.map((r) => [r.memberId, r]));
    return {
      provisional: false,
      entries: ranked.map((m) => ({
        memberId: m.id,
        name: m.name,
        trustScore: m.trustScore,
        reason: byId.get(m.id)?.reason_fr ?? reasonFor(m, 2).fr,
        reasonEn: byId.get(m.id)?.reason_en ?? reasonFor(m, 2).en,
      })),
    };
  } catch (err) {
    log(`FALLBACK: Bedrock failed (${(err as Error)?.message}), deterministic reasons`);
    return {
      provisional: false,
      entries: ranked.map((m, i) => {
        const r = reasonFor(m, i);
        return { memberId: m.id, name: m.name, trustScore: m.trustScore, reason: r.fr, reasonEn: r.en };
      }),
    };
  }
};
