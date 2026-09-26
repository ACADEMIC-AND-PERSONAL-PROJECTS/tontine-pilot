import { defineFunction } from "@aws-amplify/backend";

export const notify = defineFunction({
  name: "notify",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 512,
  environment: {
    MOCK_SEND: "false", // real SES sends; per-recipient try/catch, sandbox-safe
    SES_FROM: "tontine@tontinepilot.sn",
    APP_URL: "https://main.dhnfua5oyahpy.amplifyapp.com",
    LOGO_URL:
      "https://main.dhnfua5oyahpy.amplifyapp.com/logo.jpeg",
  },
});
