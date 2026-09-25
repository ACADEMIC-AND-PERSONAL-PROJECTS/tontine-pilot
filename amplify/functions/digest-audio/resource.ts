import { defineFunction } from "@aws-amplify/backend";

export const digestAudio = defineFunction({
  name: "digest-audio",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 512,
  environment: {
    USE_POLLY: "false", // flip to "true" to emit real mp3 (Polly needs no Bedrock quota)
  },
});
