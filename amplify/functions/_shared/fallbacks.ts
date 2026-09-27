// Deterministic fallbacks — keep the demo alive when Bedrock is
// unreachable (quotas pending). Same formulas as the frontend demo.

export function trustFor(lateCount: number, cycles: number): number {
  return Math.max(50, Math.min(99, 92 - lateCount * 7 + Math.min(6, cycles)));
}

export type KnownMember = { id: string; name: string };

/** Strict member resolution: exact full-name match (case-insensitive), else a
 *  unique first-name match. Ambiguous or unknown -> null, never a guess.
 *  Unknown names must surface as "unknown member", not as someone else. */
export function resolveMember(
  members: KnownMember[],
  rawName: string
): KnownMember | null {
  const want = rawName.trim().toLowerCase();
  if (!want) return null;
  const exact = members.find((m) => m.name.toLowerCase() === want);
  if (exact) return exact;
  const firstMatches = members.filter(
    (m) =>
      m.name.split(" ")[0].toLowerCase().includes(want) ||
      want.includes(m.name.split(" ")[0].toLowerCase())
  );
  return firstMatches.length === 1 ? firstMatches[0] : null;
}

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
  // Payer: strict resolution — unknown names resolve to null, never to a
  // random member. The UI blocks and proposes adding them to the group.
  const words = lower.split(/[^a-zàâäéèêëîïôöùûüç0-9]+/i).filter(Boolean);
  let member: KnownMember | null = null;
  for (const m of members) {
    if (lower.includes(m.name.toLowerCase())) {
      member = m;
      break;
    }
  }
  if (!member) {
    const firsts = members.filter((m) =>
      words.some(
        (w) =>
          m.name.split(" ")[0].toLowerCase().startsWith(w) ||
          w.startsWith(m.name.split(" ")[0].toLowerCase())
      )
    );
    member = firsts.length === 1 ? firsts[0] : null;
  }
  const recipient = member
    ? (members.find(
        (m) =>
          m.id !== member!.id &&
          (lower.includes(m.name.toLowerCase()) ||
            words.some((w) => m.name.split(" ")[0].toLowerCase().startsWith(w)))
      ) ?? null)
    : null;
  return {
    memberId: member?.id ?? null,
    // Empty (not a guess) when nobody matches — the caller blocks on this.
    memberName: member?.name ?? "",
    amount,
    recipientName: recipient?.name ?? "",
    confidence: member ? 0.7 : 0.35,
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
