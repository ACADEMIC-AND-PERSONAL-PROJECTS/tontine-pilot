import { defineFunction } from "@aws-amplify/backend";

export const recommendRotation = defineFunction({
  name: "recommend-rotation",
  entry: "./handler.ts",
  timeoutSeconds: 90,
  memoryMB: 512,
  environment: {
    USE_MOCK: "false",
    BEDROCK_NLU_PROFILE: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  },
});
