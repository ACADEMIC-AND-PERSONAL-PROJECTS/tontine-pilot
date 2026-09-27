import { describe, expect, it } from "vitest";
import { textractParse } from "../../amplify/functions/_shared/receipt";
import { daysLeft, scriptFor } from "../../amplify/functions/_shared/digest";

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
  it("returns null amount on unreadable input (never a fabricated payment)", () => {
    const r = textractParse(["hello world"], 20000, "Cheikh Fall", "2024-09-24");
    expect(r.amount).toBeNull();
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.provider).toBe("Unknown");
  });
  it("returns null amount for a logo with no figures", () => {
    const r = textractParse(["TontinePilot", "Community savings"], 20000, "", "2024-09-24");
    expect(r.amount).toBeNull();
  });
});

describe("scriptFor", () => {
  it("builds FR and EN scripts with all counts", () => {
    const fr = scriptFor("fr", 4, "G", "Cheikh", 200000, 240000, 10, 1, 1, 60000);
    expect(fr).toContain("Bilan cycle 4");
    expect(fr).toContain("200000");
    const en = scriptFor("en", 4, "G", "Cheikh", 200000, 240000, 10, 1, 1, 60000);
    expect(en).toContain("Cycle 4 summary");
    const dl = scriptFor("fr", 4, "G", "Cheikh", 200000, 240000, 10, 1, 1, 60000, "2024-12-31");
    expect(dl).toContain("Échéance");
    expect(daysLeft("2099-01-01")).toBeGreaterThan(0);
    expect(daysLeft(undefined)).toBeNull();
  });
});
