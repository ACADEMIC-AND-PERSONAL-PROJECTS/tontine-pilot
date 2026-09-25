import { defineFunction } from "@aws-amplify/backend";

export const remindersWorker = defineFunction({
  name: "reminders-worker",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    USE_MOCK: "true", // Bedrock drafts behind this flag
    MOCK_SEND: "true", // "true" = log only, no SES/SNS traffic (tests + quota wait)
    SES_FROM: "tontine@tontinepilot.sn",
    APP_URL: "http://localhost:3000",
  },
});
