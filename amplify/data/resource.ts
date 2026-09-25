import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

// Phase 1: models only (authenticated read, owner write).
// Phase 2 adds Lambda function resources, custom queries/mutations
// and allow.resource() grants — see TASKS.md.
const schema = a.schema({
  Group: a
    .model({
      name: a.string().required(),
      description: a.string(),
      descriptionEn: a.string(),
      currency: a.string().default("FCFA"),
      contributionAmount: a.integer().required(),
      frequency: a.enum(["WEEKLY", "MONTHLY"]),
      memberCount: a.integer().required(),
      currentCycleIndex: a.integer().required(),
      emergencyFundBalance: a.integer().required(),
      emergencyFundTarget: a.integer().required(),
      role: a.enum(["Admin", "Member"]),
      cycleCollected: a.integer(),
      cycleExpected: a.integer(),
      openAlerts: a.integer(),
      archived: a.boolean().default(false),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
  Member: a
    .model({
      groupId: a.id().required(),
      name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      trustScore: a.integer().required(),
      lateCount: a.integer().default(0),
      cyclesCompleted: a.integer().default(0),
      notifySms: a.boolean().default(false),
    })
    .secondaryIndexes((idx) => [idx("groupId")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
  Cycle: a
    .model({
      groupId: a.id().required(),
      cycleNumber: a.integer().required(),
      recipientMemberId: a.id(),
      recipientName: a.string(),
      startDate: a.date().required(),
      endDate: a.date().required(),
      status: a.enum(["OPEN", "CLOSED"]),
      totalExpected: a.integer().required(),
      totalCollected: a.integer().required(),
    })
    .secondaryIndexes((idx) => [idx("groupId")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
  Contribution: a
    .model({
      groupId: a.id().required(),
      cycleId: a.id().required(),
      memberId: a.id().required(),
      memberName: a.string().required(),
      amount: a.integer().required(),
      status: a.enum([
        "CONFIRMED",
        "PENDING",
        "LATE",
        "COVERED_BY_EMERGENCY_FUND",
      ]),
      dateDeclared: a.date(),
      rawText: a.string(),
      rawTextEn: a.string(),
      method: a.enum(["TEXT_NLU", "OCR_RECEIPT", "MANUAL", "EMERGENCY_FUND"]),
      transactionId: a.string(),
      receiptKey: a.string(),
    })
    .secondaryIndexes((idx) => [idx("groupId"), idx("cycleId")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
  Alert: a
    .model({
      groupId: a.id().required(),
      cycleId: a.id(),
      memberId: a.id(),
      memberName: a.string(),
      type: a.enum([
        "LATE_PAYMENT",
        "ANOMALY",
        "REMINDER",
        "SWAP_PROPOSAL",
        "EMERGENCY_DISPATCH",
      ]),
      message: a.string().required(),
      messageEn: a.string(),
      createdAt: a.datetime().required(),
      resolved: a.boolean().default(false),
      proposalKind: a.enum(["swap", "installment", "emergency"]),
      proposalDetails: a.string(),
      proposalDetailsEn: a.string(),
      dedupeKey: a.string().required(),
    })
    .secondaryIndexes((idx) => [idx("groupId"), idx("dedupeKey")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
  FundMovement: a
    .model({
      groupId: a.id().required(),
      cycleId: a.id(),
      kind: a.enum(["DEBIT", "REPAY"]),
      amount: a.integer().required(),
      reason: a.string(),
      reasonEn: a.string(),
      createdAt: a.datetime().required(),
    })
    .secondaryIndexes((idx) => [idx("groupId")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
  Digest: a
    .model({
      groupId: a.id().required(),
      cycleId: a.id().required(),
      locale: a.enum(["fr", "en"]),
      script: a.string().required(),
      audioKey: a.string().required(),
      createdAt: a.datetime().required(),
    })
    .secondaryIndexes((idx) => [idx("groupId")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "update", "delete"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
