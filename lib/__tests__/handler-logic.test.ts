import { describe, expect, it } from "vitest";
import { textractParse } from "../../amplify/functions/_shared/receipt";
import { scriptFor } from "../../amplify/functions/_shared/digest";

describe("textractParse", () => {
  it("extracts Wave amount + transaction id", () => {
    const r = textractParse(
      ["Wave", "Transfert reussi", "Montant: 20 000 FCFA", "ID: WV-884021", "24/09/2024"],
      20000,
      "Cheikh Fall",
      "2024-09-24"
    );
    expect(r.amount).toBe(20000);
    expect(r.transactionId).toBe("WV-884021");
    expect(r.provider).toBe("Wave");
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
  });
  it("falls back to standard amount with low confidence", () => {
    const r = textractParse(["hello world"], 20000, "Cheikh Fall", "2024-09-24");
    expect(r.amount).toBe(20000);
    expect(r.confidence).toBe(0.4);
    expect(r.provider).toBe("Unknown");
  });
});

describe("scriptFor", () => {
  it("builds FR and EN scripts with all counts", () => {
    const fr = scriptFor("fr", 4, "G", "Cheikh", 200000, 240000, 10, 1, 1, 60000);
    expect(fr).toContain("Bilan cycle 4");
    expect(fr).toContain("200000");
    const en = scriptFor("en", 4, "G", "Cheikh", 200000, 240000, 10, 1, 1, 60000);
    expect(en).toContain("Cycle 4 summary");
  });
});
