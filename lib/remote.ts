import type {
  Alert as FakeAlert,
  Contribution as FakeContribution,
  Group as FakeGroup,
  Member as FakeMember,
} from "./fake-data";

// AppSync row -> frontend demo types. Enums are identical by design (03);
// throw loudly on mismatch so contract drift is caught in dev, not demos.
type Row = Record<string, unknown>;

function req<T>(v: unknown, what: string): T {
  if (v === null || v === undefined) throw new Error(`REMOTE: missing ${what}`);
  return v as T;
}

export function toMember(r: Row): FakeMember {
  return {
    id: req<string>(r.id, "Member.id"),
    name: req<string>(r.name, "Member.name"),
    phone: (r.phone as string) ?? "",
    email: req<string>(r.email, "Member.email"),
    joinedAt: (r.createdAt as string) ?? "",
    trustScore: req<number>(r.trustScore, "Member.trustScore"),
    lateCount: (r.lateCount as number) ?? 0,
    cyclesCompleted: (r.cyclesCompleted as number) ?? 0,
    ownerId: (r.ownerId as string) ?? undefined,
  };
}

export function toContribution(r: Row): FakeContribution {
  const status = req<string>(r.status, "Contribution.status");
  if (!["CONFIRMED", "PENDING", "LATE", "COVERED_BY_EMERGENCY_FUND"].includes(status))
    throw new Error(`REMOTE: unknown Contribution.status ${status}`);
  return {
    id: req<string>(r.id, "Contribution.id"),
    memberId: req<string>(r.memberId, "Contribution.memberId"),
    memberName: req<string>(r.memberName, "Contribution.memberName"),
    amount: req<number>(r.amount, "Contribution.amount"),
    status: status as FakeContribution["status"],
    dateDeclared: (r.dateDeclared as string) ?? "",
    rawText: (r.rawText as string) ?? "",
    rawTextEn: (r.rawTextEn as string) ?? undefined,
    method: (r.method as FakeContribution["method"]) ?? undefined,
    transactionId: (r.transactionId as string) ?? undefined,
  };
}

export function toAlert(r: Row): FakeAlert {
  const type = req<string>(r.type, "Alert.type");
  if (!["LATE_PAYMENT", "ANOMALY", "REMINDER", "SWAP_PROPOSAL", "EMERGENCY_DISPATCH"].includes(type))
    throw new Error(`REMOTE: unknown Alert.type ${type}`);
  const proposalKind = r.proposalKind as string | null;
  return {
    id: req<string>(r.id, "Alert.id"),
    groupId: (r.groupId as string) ?? undefined,
    cycleId: (r.cycleId as string) ?? undefined,
    memberId: (r.memberId as string) ?? "",
    memberName: (r.memberName as string) ?? "",
    type: type as FakeAlert["type"],
    message: req<string>(r.message, "Alert.message"),
    messageEn: (r.messageEn as string) ?? undefined,
    createdAt: req<string>(r.createdAt, "Alert.createdAt"),
    resolved: (r.resolved as boolean) ?? false,
    proposal: proposalKind
      ? {
          kind: proposalKind as "swap" | "installment" | "emergency",
          details: (r.proposalDetails as string) ?? "",
          detailsEn: (r.proposalDetailsEn as string) ?? undefined,
        }
      : undefined,
  };
}

export function toGroup(r: Row): FakeGroup {
  return {
    id: req<string>(r.id, "Group.id"),
    name: req<string>(r.name, "Group.name"),
    description: (r.description as string) ?? "",
    descriptionEn: (r.descriptionEn as string) ?? undefined,
    currency: (r.currency as string) ?? "FCFA",
    contributionAmount: req<number>(r.contributionAmount, "Group.contributionAmount"),
    frequency: (r.frequency as "WEEKLY" | "MONTHLY") ?? "MONTHLY",
    memberCount: req<number>(r.memberCount, "Group.memberCount"),
    currentCycleIndex: req<number>(r.currentCycleIndex, "Group.currentCycleIndex"),
    createdAt: (r.createdAt as string) ?? "",
    emergencyFundBalance: req<number>(r.emergencyFundBalance, "Group.emergencyFundBalance"),
    emergencyFundTarget: req<number>(r.emergencyFundTarget, "Group.emergencyFundTarget"),
    role: (r.role as "Admin" | "Member") ?? undefined,
    startDate: (r.startDate as string) ?? undefined,
    endDate: (r.endDate as string) ?? undefined,
    ownerId: (r.ownerId as string) ?? undefined,
    cycleCollected: (r.cycleCollected as number) ?? undefined,
    cycleExpected: (r.cycleExpected as number) ?? undefined,
    openAlerts: (r.openAlerts as number) ?? undefined,
    archived: (r.archived as boolean) ?? undefined,
  };
}
