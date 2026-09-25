import { describe, expect, it } from "vitest";
import { toAlert, toContribution, toGroup, toMember } from "../remote";

describe("remote adapters", () => {
  it("maps a Member row", () => {
    expect(
      toMember({ id: "m1", name: "Aïssatou", email: "a@x.sn", trustScore: 98 })
    ).toMatchObject({ id: "m1", lateCount: 0, cyclesCompleted: 0 });
  });
  it("rejects unknown Contribution status", () => {
    expect(() =>
      toContribution({ id: "c", memberId: "m", memberName: "M", amount: 1, status: "WEIRD" })
    ).toThrow(/unknown Contribution.status/);
  });
  it("rejects unknown Alert type", () => {
    expect(() =>
      toAlert({ id: "a", type: "NOPE", message: "x", createdAt: "2024-01-01" })
    ).toThrow(/unknown Alert.type/);
  });
  it("maps Alert proposal when present, undefined when absent", () => {
    expect(toAlert({ id: "a", type: "REMINDER", message: "x", createdAt: "t" }).proposal).toBeUndefined();
    expect(
      toAlert({ id: "a", type: "REMINDER", message: "x", createdAt: "t", proposalKind: "swap", proposalDetails: "d" }).proposal?.kind
    ).toBe("swap");
  });
  it("maps a Group row with defaults", () => {
    const g = toGroup({
      id: "group-1", name: "G", contributionAmount: 20000, memberCount: 12,
      currentCycleIndex: 4, emergencyFundBalance: 0, emergencyFundTarget: 1,
    });
    expect(g.currency).toBe("FCFA");
    expect(g.frequency).toBe("MONTHLY");
  });
});
