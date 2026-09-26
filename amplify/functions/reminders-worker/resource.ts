import { defineFunction } from "@aws-amplify/backend";

export const remindersWorker = defineFunction({
  name: "reminders-worker",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    USE_MOCK: "false", // Bedrock drafts behind this flag
    MOCK_SEND: "true", // "true" = log only, no SES/SNS traffic (tests + quota wait)
    SES_FROM: "tontine@tontinepilot.sn",
    LOGO_URL: "https://main.dhnfua5oyahpy.amplifyapp.com/logo.jpeg",
    APP_URL: "https://main.dhnfua5oyahpy.amplifyapp.com",
  },
});
