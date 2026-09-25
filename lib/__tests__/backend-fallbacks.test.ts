import { describe, expect, it } from "vitest";
import {
  dedupeKey,
  heuristicParse,
  lottery,
  templateNudge,
  trustFor,
} from "../../amplify/functions/_shared/fallbacks";

describe("trustFor", () => {
  it("base 92, -7 per late, +1 per cycle capped at +6, clamped 50..99", () => {
    expect(trustFor(0, 4)).toBe(96);
    expect(trustFor(3, 4)).toBe(75);
    expect(trustFor(0, 30)).toBe(98);
    expect(trustFor(10, 0)).toBe(50);
  });
});

describe("heuristicParse", () => {
  const members = [
    { id: "m1", name: "Aïssatou Diallo" },
    { id: "m4", name: "Cheikh Fall" },
  ];
  it("extracts amount and recipient", () => {
    const r = heuristicParse("J'ai payé 20000 pour Cheikh", members, 20000, "Cheikh Fall");
    expect(r.amount).toBe(20000);
    expect(r.recipientName).toBe("Cheikh Fall");
  });
  it("expands 20k and small amounts", () => {
    expect(heuristicParse("payé 20k", members, 20000, "Cheikh Fall").amount).toBe(20000);
    expect(heuristicParse("payé 20", members, 20000, "Cheikh Fall").amount).toBe(20000);
  });
});

describe("lottery", () => {
  it("is deterministic per seed and preserves all items", () => {
    const a = lottery([1, 2, 3, 4], "cycle-1");
    expect(lottery([1, 2, 3, 4], "cycle-1")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("dedupeKey", () => {
  it("builds stable composite keys", () => {
    expect(dedupeKey("g", "c", "m", "LATE_PAYMENT")).toBe("g#c#m#LATE_PAYMENT");
  });
});

describe("templateNudge", () => {
  it("produces FR + EN messages", () => {
    const t = templateNudge("Ibrahima", 20000, "septembre", "late");
    expect(t.message_fr).toContain("Ibrahima");
    expect(t.message_en).toContain("Ibrahima");
  });
});
