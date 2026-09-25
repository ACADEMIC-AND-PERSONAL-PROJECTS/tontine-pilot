// Pure receipt-text parsing (Textract LINES -> OcrResult fields).
// Testable without AWS; handler in parse-receipt/handler.ts calls this.
export function textractParse(
  lines: string[],
  standardAmount: number,
  recipient: string,
  today = new Date().toISOString().slice(0, 10)
) {
  const joined = lines.join("\n");
  const amounts = [...joined.matchAll(/(\d[\d\s]*)\s*(?:FCFA|F\s?CFA|F|CFA)?/gi)]
    .map((m) => parseInt(m[1].replace(/\s/g, ""), 10))
    .filter((n) => n >= 1000 && n <= 10000000);
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
    amount: amounts[0] ?? standardAmount,
    transactionId: txn,
    recipientName: recipient,
    date: today,
    provider,
    confidence: amounts[0] ? 0.75 : 0.4,
  };
}
