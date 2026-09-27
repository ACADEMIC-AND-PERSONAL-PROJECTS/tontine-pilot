import { describe, expect, it } from "vitest";
import { installmentHalves, nextOpenCycleId, splitCycles } from "../catchup";

const cycles = [
  { id: "c1", cycleNumber: 1, status: "CLOSED", endDate: "2024-06-30", totalExpected: 240000 },
  { id: "c2", cycleNumber: 2, status: "CLOSED", endDate: "2024-07-31", totalExpected: 240000 },
  { id: "c3", cycleNumber: 3, status: "OPEN", endDate: "2024-09-30", totalExpected: 240000 },
  { id: "c4", cycleNumber: 4, status: "OPEN", endDate: "2024-12-31", totalExpected: 0 },
];

describe("splitCycles", () => {
  it("splits missed vs open and sorts by cycle number", () => {
    const { missed, open } = splitCycles(cycles, "2024-09-10");
    expect(missed.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(open.map((c) => c.id)).toEqual(["c3", "c4"]);
  });
  it("treats an OPEN cycle past its end date as missed", () => {
    const { missed, open } = splitCycles(
      [{ id: "c9", cycleNumber: 9, status: "OPEN", endDate: "2024-01-31", totalExpected: 0 }],
      "2024-09-10"
    );
    expect(missed.map((c) => c.id)).toEqual(["c9"]);
    expect(open).toEqual([]);
  });
  it("catch-up totals derive from the split", () => {
    const { missed, open } = splitCycles(cycles, "2024-09-10");
    const totalDue = (missed.length + open.length) * 20000;
    expect(totalDue).toBe(80000);
  });
});

describe("installmentHalves", () => {
  it("splits evenly and keeps odd sums exact", () => {
    expect(installmentHalves(20000)).toEqual([10000, 10000]);
    expect(installmentHalves(15001)).toEqual([7500, 7501]);
    expect(installmentHalves(0)).toEqual([0, 0]);
  });
});

describe("nextOpenCycleId", () => {
  const cycles = [
    { id: "c1", cycleNumber: 1, status: "CLOSED" },
    { id: "c2", cycleNumber: 2, status: "OPEN" },
    { id: "c3", cycleNumber: 3, status: "OPEN" },
  ];
  it("returns the next OPEN cycle after the current one", () => {
    expect(nextOpenCycleId(cycles, "c2")).toBe("c3");
  });
  it("returns null on the last open cycle or with no open cycle", () => {
    expect(nextOpenCycleId(cycles, "c3")).toBeNull();
    expect(nextOpenCycleId(cycles, "c1")).toBe("c2");
    expect(nextOpenCycleId([], "c1")).toBeNull();
  });
});

describe("deleteGroupCascade", () => {
  it("deletes children before the group and reports counts", async () => {
    const { deleteGroupCascade } = await import("../catchup");
    const calls: string[] = [];
    const table = (ids: string[]) => ({
      list: async () => ({ data: ids.map((id) => ({ id })) }),
      delete: async ({ id }: { id: string }) => {
        calls.push(id);
      },
    });
    const models = {
      Contribution: table(["c1", "c2"]),
      Alert: table(["a1"]),
      Digest: table([]),
      FundMovement: table([]),
      Cycle: table(["cy1"]),
      Member: table(["m1"]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Group: { list: async () => ({ data: [] }), delete: async ({ id }: { id: string }) => { calls.push(id); } } as any,
    };
    const counts = await deleteGroupCascade(models as never, "g1");
    expect(counts).toEqual({ Contribution: 2, Alert: 1, Digest: 0, FundMovement: 0, Cycle: 1, Member: 1, Group: 1 });
    expect(calls[calls.length - 1]).toBe("g1");
  });
});

describe("subFromStorage", () => {
  it("reads the sub when tokens were persisted", async () => {
    const { subFromStorage } = await import("../session");
    const store: Record<string, string> = {
      "CognitoIdentityServiceProvider.abc123.LastAuthUser": "sub-1",
      "CognitoIdentityServiceProvider.abc123.sub-1.idToken": "jwt",
      "CognitoIdentityServiceProvider.abc123.sub-1.accessToken": "jwt",
    };
    const storage = {
      getItem: (k: string) => store[k] ?? null,
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: Object.keys(store).length,
    };
    expect(subFromStorage(storage)).toBe("sub-1");
  });
  it("returns null without persisted tokens", async () => {
    const { subFromStorage } = await import("../session");
    const storage = { getItem: () => null, key: () => null, length: 0 };
    expect(subFromStorage(storage)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("keeps FCFA rendering and formats USD", async () => {
    const { formatMoney } = await import("../utils");
    expect(formatMoney(20000, "FCFA", "en")).toBe("20,000 FCFA");
    expect(formatMoney(20000, undefined, "en")).toBe("20,000 FCFA");
    expect(formatMoney(30, "USD", "en")).toBe("$30");
    expect(formatMoney(30, "USD", "fr")).toContain("30");
  });
});

describe("cycleWindow", () => {
  it("spans a real month from the group start", async () => {
    const { cycleWindow } = await import("../utils");
    expect(cycleWindow("2024-09-01", "MONTHLY")).toEqual({ startDate: "2024-09-01", endDate: "2024-10-01" });
    expect(cycleWindow("2024-09-01", "WEEKLY")).toEqual({ startDate: "2024-09-01", endDate: "2024-09-08" });
  });
  it("clamps month overflow and defaults sanely", async () => {
    const { cycleWindow } = await import("../utils");
    expect(cycleWindow("2024-01-31", "MONTHLY").endDate).toBe("2024-02-29");
    expect(cycleWindow("2025-01-31", "MONTHLY").endDate).toBe("2025-02-28");
    const w = cycleWindow("not-a-date", "MONTHLY");
    expect(w.startDate).not.toBe(w.endDate);
  });
});
