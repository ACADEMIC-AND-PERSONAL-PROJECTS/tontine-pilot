import { describe, expect, it } from "vitest";
import { recommendRotationOrder, type Member } from "../fake-data";

const mk = (over: Partial<Member> & { name: string }): Member => ({
  id: over.name,
  phone: "",
  email: "",
  joinedAt: "",
  trustScore: 85,
  ...over,
});

describe("recommendRotationOrder", () => {
  it("ranks higher trust first", () => {
    const out = recommendRotationOrder([
      mk({ name: "Low", trustScore: 70 }),
      mk({ name: "High", trustScore: 97 }),
    ]);
    expect(out.map((m) => m.name)).toEqual(["High", "Low"]);
  });

  it("breaks trust ties by fewer lates, then seniority", () => {
    const out = recommendRotationOrder([
      mk({ name: "Late", trustScore: 90, lateCount: 2, cyclesCompleted: 9 }),
      mk({ name: "New", trustScore: 90, lateCount: 0, cyclesCompleted: 0 }),
      mk({ name: "Senior", trustScore: 90, lateCount: 0, cyclesCompleted: 5 }),
    ]);
    expect(out.map((m) => m.name)).toEqual(["Senior", "New", "Late"]);
  });

  it("puts the recurring-late profile last (seed case: Ibrahima)", () => {
    const out = recommendRotationOrder([
      mk({ name: "Aïssatou", trustScore: 96, lateCount: 0, cyclesCompleted: 4 }),
      mk({ name: "Ibrahima", trustScore: 75, lateCount: 3, cyclesCompleted: 4 }),
      mk({ name: "Fatou", trustScore: 95, lateCount: 0, cyclesCompleted: 3 }),
    ]);
    expect(out.at(-1)?.name).toBe("Ibrahima");
    expect(out[0].name).toBe("Aïssatou");
  });
});
