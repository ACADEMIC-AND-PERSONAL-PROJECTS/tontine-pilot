import { describe, expect, it } from "vitest";
import { applyLateEvent, recomputeTrust } from "../../amplify/functions/_shared/trust";

describe("recomputeTrust", () => {
  it("matches the creation formula", () => {
    expect(recomputeTrust(0, 4)).toBe(96);
    expect(recomputeTrust(3, 4)).toBe(75);
    expect(recomputeTrust(0, 0)).toBe(92);
  });
});

describe("applyLateEvent", () => {
  it("bumps lates and recomputes trust", async () => {
    const store = { lateCount: 2, cyclesCompleted: 4 };
    const updates: Record<string, unknown>[] = [];
    const models = {
      Member: {
        get: async () => ({ data: { ...store } }),
        update: async (a: Record<string, unknown>) => {
          updates.push(a);
          return {};
        },
      },
    };
    const r = await applyLateEvent(models, "m6");
    expect(r).toEqual({ lateCount: 3, trustScore: 75 });
    expect(updates[0]).toMatchObject({ id: "m6", lateCount: 3, trustScore: 75 });
  });
  it("returns null for unknown member", async () => {
    const models = {
      Member: {
        get: async () => ({ data: null }),
        update: async () => ({}),
      },
    };
    expect(await applyLateEvent(models, "nope")).toBeNull();
  });
});
