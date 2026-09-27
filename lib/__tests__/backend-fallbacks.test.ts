import { describe, expect, it } from "vitest";
import {
  currencyLabel,
  dedupeKey,
  formatAmount,
  heuristicParse,
  lottery,
  resolveMember,
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
  it("extracts amount and member (named person = member of record)", () => {
    const r = heuristicParse("J'ai payé 20000 pour Cheikh", members, 20000, "Cheikh Fall");
    expect(r.amount).toBe(20000);
    expect(r.memberId).toBe("m4");
    expect(r.memberName).toBe("Cheikh Fall");
    expect(r.recipientName).toBe("");
  });
  it("expands 20k and small amounts", () => {
    expect(heuristicParse("payé 20k", members, 20000, "Cheikh Fall").amount).toBe(20000);
    expect(heuristicParse("payé 20", members, 20000, "Cheikh Fall").amount).toBe(20000);
  });
  it("never maps an unknown payer to another member", () => {
    const r = heuristicParse("John paid 20000 this month", members, 20000, "Cheikh Fall");
    expect(r.memberId).toBeNull();
    expect(r.memberName).toBe("");
    expect(r.confidence).toBeLessThan(0.5);
  });
  it("resolves a unique first name", () => {
    const r = heuristicParse("Aïssatou a payé 20000", members, 20000, "Cheikh Fall");
    expect(r.memberId).toBe("m1");
    expect(r.memberName).toBe("Aïssatou Diallo");
  });
});

describe("resolveMember", () => {
  const members = [
    { id: "m1", name: "Aïssatou Diallo" },
    { id: "m2", name: "Awa Ndiaye" },
    { id: "m3", name: "Awa Sarr" },
  ];
  it("matches exact full names case-insensitively", () => {
    expect(resolveMember(members, "awa ndiaye")?.id).toBe("m2");
  });
  it("matches a unique first name", () => {
    expect(resolveMember(members, "Aïssatou")?.id).toBe("m1");
  });
  it("returns null on ambiguity", () => {
    expect(resolveMember(members, "Awa")).toBeNull();
  });
  it("returns null for strangers and empties", () => {
    expect(resolveMember(members, "John")).toBeNull();
    expect(resolveMember(members, "  ")).toBeNull();
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

describe("USD handling", () => {
  const members = [{ id: "m1", name: "Awa Sarr" }];
  it("never multiplies small USD amounts", () => {
    expect(heuristicParse("I paid 30 for Awa", members, 30, "", "USD").amount).toBe(30);
    expect(heuristicParse("paid 20", members, 30, "", "USD").amount).toBe(20);
  });
  it("keeps FCFA conventions for FCFA groups", () => {
    expect(heuristicParse("payé 20", members, 20000, "", "FCFA").amount).toBe(20000);
  });
  it("formats backend amounts per currency", () => {
    expect(formatAmount(20000, "FCFA")).toBe("20\u202f000 FCFA");
    expect(formatAmount(30, "USD")).toBe("$30");
    expect(currencyLabel("USD")).toBe("USD");
    expect(currencyLabel(undefined)).toBe("FCFA");
  });
});
