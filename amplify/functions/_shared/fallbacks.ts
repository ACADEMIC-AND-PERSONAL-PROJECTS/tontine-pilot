// Deterministic fallbacks — keep the demo alive when Bedrock is
// unreachable (quotas pending). Same formulas as the frontend demo.

export function trustFor(lateCount: number, cycles: number): number {
  return Math.max(50, Math.min(99, 92 - lateCount * 7 + Math.min(6, cycles)));
}

/** Currency label for amounts (FCFA default). Shared by backend strings. */
export function currencyLabel(currency?: string | null): string {
  return currency === "USD" ? "USD" : "FCFA";
}

/** Backend amount formatting: "20 000 FCFA" vs "$30". */
export function formatAmount(amount: number, currency?: string | null): string {
  if (currency === "USD") return `$${amount.toLocaleString("en-US")}`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
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
  recipientName: string,
  currency?: string | null
) {
  const lower = text.toLowerCase();
  const amountMatch = text.match(/(\d[\d\s]*\d|\d+)/);
  let amount = standardAmount;
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/\s/g, ""), 10);
    // ×1000 and "vingt mille/20k" are FCFA conventions — never apply to USD
    // (a $30 declaration must stay $30).
    if (currency !== "USD") {
      if (amount < 1000) amount = amount * 1000;
    }
  }
  if (currency !== "USD" && /vingt\s*mille|20k|20\s*k/i.test(text)) amount = standardAmount;
  // Strict multi-name resolution, in order of appearance in the text:
  // every name must be a real roster member (full name, else a first name
  // matching exactly ONE member for that word — "Awa" with two Awas matches
  // nobody). First distinct match = payer of record ("I paid 20000 for Awa"
  // settles Awa's share), second distinct match = recipient. Zero matches ->
  // null (unknown payer, UI blocks + proposes adding).
  const words = lower.split(/[^a-zàâäéèêëîïôöùûüç0-9]+/i).filter(Boolean);
  const hits: Array<{ m: KnownMember; at: number }> = [];
  const seen = new Set<string>();
  const add = (m: KnownMember, at: number) => {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      hits.push({ m, at });
    }
  };
  for (const m of members) {
    const at = lower.indexOf(m.name.toLowerCase());
    if (at >= 0) add(m, at);
  }
  for (const w of words) {
    const who = members.filter((m) => {
      if (seen.has(m.id)) return false;
      const first = m.name.split(" ")[0].toLowerCase();
      return first.startsWith(w) || w.startsWith(first);
    });
    if (who.length === 1) add(who[0], lower.indexOf(w));
  }
  hits.sort((a, b) => a.at - b.at);
  const member = hits[0]?.m ?? null;
  const recipient = hits.find((x) => x.m.id !== member?.id)?.m ?? null;
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
  kind: "late" | "reminder",
  currency?: string | null
) {
  const money = formatAmount(amount, currency);
  if (kind === "reminder") {
    return {
      message: `Modou, n'oublie pas : ${memberName}`,
      message_fr: `${memberName}, rappel : ta cotisation de ${money} pour le cycle de ${monthLabel} approche. Merci de payer avant la fin du mois.`,
      message_en: `${memberName}, reminder: your ${money} contribution for the ${monthLabel} cycle is due soon. Please pay before month end.`,
    };
  }
  return {
    message_fr: `${memberName}, rappel amical : ta cotisation de ${money} pour le cycle de ${monthLabel} est en retard. Peux-tu régulariser rapidement ? Merci !`,
    message_en: `${memberName}, friendly reminder: your ${money} contribution for the ${monthLabel} cycle is late. Can you settle it soon? Thank you!`,
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
