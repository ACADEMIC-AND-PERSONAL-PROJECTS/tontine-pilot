import { defineFunction } from "@aws-amplify/backend";

export const parseReceipt = defineFunction({
  name: "parse-receipt",
  entry: "./handler.ts",
  timeoutSeconds: 180,
  memoryMB: 1024,
  environment: {
    USE_MOCK: "true",
    BEDROCK_VISION_PROFILE: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    OCR_ENGINE: "textract", // "textract" (no quota needed) or "bedrock" (when quotas granted)
  },
});
