import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { parseDeclaration } from "../functions/parse-declaration/resource";
import { parseReceipt } from "../functions/parse-receipt/resource";
import { mediate } from "../functions/mediate/resource";
import { recommendRotation } from "../functions/recommend-rotation/resource";
import { digestAudio } from "../functions/digest-audio/resource";
import { remindersWorker } from "../functions/reminders-worker/resource";
import { assistant } from "../functions/assistant/resource";
import { notify } from "../functions/notify/resource";

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
    startDate: a.date(),
    endDate: a.date(),
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

  ParseResult: a.customType({
    memberId: a.string(), memberName: a.string(), amount: a.integer(),
    recipientName: a.string(), confidence: a.float(),
    rawText: a.string(), rawTextEn: a.string(),
  }),
  OcrResult: a.customType({
    amount: a.integer(), transactionId: a.string(), recipientName: a.string(),
    date: a.string(), provider: a.string(), confidence: a.float(),
  }),
  NudgeDraft: a.customType({ message: a.string(), messageEn: a.string(), details: a.string(), detailsEn: a.string() }),
  RotationEntry: a.customType({
    memberId: a.string(), name: a.string(), trustScore: a.integer(),
    reason: a.string(), reasonEn: a.string(),
  }),
  RotationResult: a.customType({ provisional: a.boolean(), entries: a.ref("RotationEntry").array() }),
  DigestResult: a.customType({ script: a.string(), audioUrl: a.string() }),
  AssistantAnswer: a.customType({ answer: a.string() }),
  SendResult: a.customType({ sentEmail: a.boolean(), sentSms: a.boolean() }),
  NotifyResult: a.customType({ sent: a.integer(), skipped: a.integer() }),

  parseDeclaration: a.query()
    .arguments({ text: a.string().required(), groupId: a.string().required() })
    .returns(a.ref("ParseResult")).handler(a.handler.function(parseDeclaration))
    .authorization((allow) => [allow.authenticated()]),
  parseReceipt: a.query()
    .arguments({ s3Key: a.string().required(), groupId: a.string().required() })
    .returns(a.ref("OcrResult")).handler(a.handler.function(parseReceipt))
    .authorization((allow) => [allow.authenticated()]),
  draftNudge: a.query()
    .arguments({ alertId: a.string().required(), locale: a.string().required() })
    .returns(a.ref("NudgeDraft")).handler(a.handler.function(mediate))
    .authorization((allow) => [allow.authenticated()]),
  recommendRotationOp: a.query()
    .arguments({ groupId: a.string().required() })
    .returns(a.ref("RotationResult")).handler(a.handler.function(recommendRotation))
    .authorization((allow) => [allow.authenticated()]),
  buildDigest: a.query()
    .arguments({ cycleId: a.string().required(), locale: a.string().required() })
    .returns(a.ref("DigestResult")).handler(a.handler.function(digestAudio))
    .authorization((allow) => [allow.authenticated()]),
  askAssistant: a.query()
    .arguments({
      question: a.string().required(),
      locale: a.string().required(),
      history: a.json(),
    })
    .returns(a.ref("AssistantAnswer")).handler(a.handler.function(assistant))
    .authorization((allow) => [allow.authenticated()]),
  notifyNewGroup: a.mutation()
    .arguments({ groupId: a.string().required() })
    .returns(a.ref("NotifyResult")).handler(a.handler.function(notify))
    .authorization((allow) => [allow.authenticated()]),
  sendNudge: a.mutation()
    .arguments({ alertId: a.string().required() })
    .returns(a.ref("SendResult")).handler(a.handler.function(remindersWorker))
    .authorization((allow) => [allow.authenticated()]),
});

const schemaWithAuth = schema.authorization((allow) => [
  allow.resource(parseDeclaration).to(["query"]),
  allow.resource(parseReceipt).to(["query"]),
  allow.resource(mediate).to(["query", "mutate"]),
  allow.resource(recommendRotation).to(["query"]),
  allow.resource(digestAudio).to(["query", "mutate"]),
  allow.resource(remindersWorker).to(["query", "mutate"]),
  allow.resource(assistant).to(["query"]),
  allow.resource(notify).to(["query", "mutate"]),
]);

export type Schema = ClientSchema<typeof schemaWithAuth>;
export const data = defineData({ schema: schemaWithAuth });
