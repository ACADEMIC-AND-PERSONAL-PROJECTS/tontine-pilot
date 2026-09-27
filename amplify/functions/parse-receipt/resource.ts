import { defineFunction } from "@aws-amplify/backend";

export const parseReceipt = defineFunction({
  name: "parse-receipt",
  entry: "./handler.ts",
  timeoutSeconds: 180,
  memoryMB: 1024,
  environment: {
    USE_MOCK: "false",
    // Haiku 4.5 does vision and is subscribed in this account (Sonnet 4.5
    // inference profile is marketplace-blocked here — see CloudWatch logs).
    BEDROCK_VISION_PROFILE: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    OCR_ENGINE: "bedrock", // "textract" (no quota needed) or "bedrock" (when quotas granted)
  },
});
