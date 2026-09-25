import { defineFunction } from "@aws-amplify/backend";

export const mediate = defineFunction({
  name: "mediate",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    USE_MOCK: "false",
    BEDROCK_NLU_PROFILE: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  },
});
