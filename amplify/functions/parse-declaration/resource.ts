import { defineFunction } from "@aws-amplify/backend";

export const parseDeclaration = defineFunction({
  name: "parse-declaration",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    USE_MOCK: "true", // flip to "false" when Bedrock quotas granted (TASKS.md)
    BEDROCK_NLU_PROFILE: "eu.anthropic.claude-haiku-4-5-20251001-v1:0",
  },
});
