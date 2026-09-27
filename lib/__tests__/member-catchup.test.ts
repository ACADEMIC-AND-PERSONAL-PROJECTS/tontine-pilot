import { describe, expect, it } from "vitest";
import { splitCycles } from "../catchup";

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
