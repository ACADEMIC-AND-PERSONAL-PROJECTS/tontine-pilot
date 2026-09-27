// Pure receipt-text parsing (Textract LINES -> OcrResult fields).
// Testable without AWS; handler in parse-receipt/handler.ts calls this.
// Honest failure: when no amount is readable the amount is null (never the
// standard contribution) so the UI shows "unreadable receipt" instead of a
// fabricated payment.
export function textractParse(
  lines: string[],
  standardAmount: number,
  recipient: string,
  today = new Date().toISOString().slice(0, 10),
  currency?: string | null
) {
  const joined = lines.join("\n");
  const toNum = (raw: string) => parseInt(raw.replace(/\s/g, ""), 10);
  const inRange = (n: number) => n >= 1 && n <= 10000000;
  // Amounts glued to a currency marker ($45, 30 USD, 20 000 FCFA) win: bare
  // figures may be dates or IDs. FCFA receipts show thousands; USD shows
  // small figures.
  const marked = [
    ...[...joined.matchAll(/\$\s*(\d[\d\s]*(?:\.\d+)?)/g)].map((m) => toNum(m[1])),
    ...[...joined.matchAll(/(\d[\d\s]*)\s*(?:USD|FCFA|F\s?CFA|CFA)/gi)].map((m) =>
      toNum(m[1])
    ),
  ].filter(inRange);
  let amounts = marked;
  if (amounts.length === 0 && currency !== "USD") {
    // Legacy FCFA path: bare thousands (markers often missing on scans).
    amounts = [...joined.matchAll(/(\d[\d\s]*)/g)]
      .map((m) => toNum(m[1]))
      .filter((n) => n >= 1000 && n <= 10000000);
  }
  const txn =
    joined.match(/\b((?:WV|OM|TRX|TXN|ID)[-\s:]?[A-Z0-9-]{4,})\b/i)?.[1]?.replace(/\s+/g, "") ?? null;
  const provider = /wave/i.test(joined)
    ? "Wave"
    : /orange/i.test(joined)
      ? "Orange Money"
      : /mtn/i.test(joined)
        ? "MTN"
        : "Unknown";
  return {
    amount: amounts[0] ?? null,
    transactionId: txn,
    recipientName: recipient,
    date: today,
    provider,
    confidence: amounts[0] ? 0.75 : 0.3,
  };
}
