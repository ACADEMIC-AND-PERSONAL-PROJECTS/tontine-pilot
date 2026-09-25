// Deterministic fallbacks — keep the demo alive when Bedrock is
// unreachable (quotas pending). Same formulas as the frontend demo.

export function trustFor(lateCount: number, cycles: number): number {
  return Math.max(50, Math.min(99, 92 - lateCount * 7 + Math.min(6, cycles)));
}

export type KnownMember = { id: string; name: string };

export function heuristicParse(
  text: string,
  members: KnownMember[],
  standardAmount: number,
  recipientName: string
) {
  const lower = text.toLowerCase();
  const amountMatch = text.match(/(\d[\d\s]*\d|\d+)/);
  let amount = standardAmount;
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/\s/g, ""), 10);
    if (amount < 1000) amount = amount * 1000;
  }
  if (/vingt\s*mille|20k|20\s*k/i.test(text)) amount = standardAmount;
  const member =
    members.find((m) => lower.includes(m.name.split(" ")[0].toLowerCase())) ??
    members[0];
  const recipient =
    members.find(
      (m) => m.id !== member.id && lower.includes(m.name.split(" ")[0].toLowerCase())
    ) ?? null;
  return {
    memberId: member?.id ?? null,
    memberName: member?.name ?? text.slice(0, 40),
    amount,
    recipientName: recipient?.name ?? recipientName,
    confidence: 0.7,
    rawTextEn: text, // translators offline: keep original; Bedrock fills this when live
  };
}

export function templateNudge(
  memberName: string,
  amount: number,
  monthLabel: string,
  kind: "late" | "reminder"
) {
  if (kind === "reminder") {
    return {
      message: `Modou, n'oublie pas : ${memberName}`,
      message_fr: `${memberName}, rappel : ta cotisation de ${amount} FCFA pour le cycle de ${monthLabel} approche. Merci de payer avant la fin du mois.`,
      message_en: `${memberName}, reminder: your ${amount} FCFA contribution for the ${monthLabel} cycle is due soon. Please pay before month end.`,
    };
  }
  return {
    message_fr: `${memberName}, rappel amical : ta cotisation de ${amount} FCFA pour le cycle de ${monthLabel} est en retard. Peux-tu régulariser rapidement ? Merci !`,
    message_en: `${memberName}, friendly reminder: your ${amount} FCFA contribution for the ${monthLabel} cycle is late. Can you settle it soon? Thank you!`,
  };
}

/** Deterministic lottery (mulberry32) for cold-start provisional order. */
export function lottery<T>(items: T[], seedStr: string): T[] {
  let h = 2166136261;
  for (const c of seedStr) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const dedupeKey = (groupId: string, cycleId: string, memberId: string, type: string) =>
  `${groupId}#${cycleId}#${memberId}#${type}`;
