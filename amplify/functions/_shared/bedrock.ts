import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";

// Adaptive retry (skill: amazon-bedrock). maxTokens ALWAYS explicit at call sites.
export const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? "us-east-1",
  maxAttempts: 5,
  retryMode: "adaptive",
});

export const USE_MOCK = (process.env.USE_MOCK ?? "true").toLowerCase() !== "false";
export const NLU_PROFILE =
  process.env.BEDROCK_NLU_PROFILE ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";
export const VISION_PROFILE =
  process.env.BEDROCK_VISION_PROFILE ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0"; // Haiku does vision; Sonnet profile is marketplace-blocked here

export function log(...args: unknown[]) {
  console.log(...args);
}

export async function converseText(
  modelId: string,
  system: string,
  userText: string,
  maxTokens = 800
): Promise<string> {
  const started = Date.now();
  try {
    const res = await bedrock.send(
      new ConverseCommand({
        modelId,
        system: [{ text: system }],
        messages: [{ role: "user", content: [{ text: userText }] }],
        inferenceConfig: { maxTokens, temperature: 0.2 },
      })
    );
    log(`CONVERSE_OK ms=${Date.now() - started} model=${modelId}`);
    const first: ContentBlock | undefined = res.output?.message?.content?.[0];
    return first && "text" in first ? (first.text ?? "") : "";
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "Unknown";
    // Retryable: Throttling/Timeout/Unavailable/Internal (SDK adaptive retry
    // already retried). Never retry Validation/AccessDenied — go to fallback.
    log(`CONVERSE_FAIL name=${name} model=${modelId} err=${(err as Error)?.message}`);
    throw err;
  }
}

/** Extract first {...} JSON object from model output (tolerates prose). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no-json");
  return JSON.parse(text.slice(start, end + 1));
}

/** Invoke a Bedrock Prompt Management version directly: the prompt ARN goes
 *  in modelId, variables fill the {{...}} template server-side (needs
 *  bedrock:RenderPrompt). No inferenceConfig here: the variant already
 *  carries temperature/maxTokens and the API rejects overrides.
 *  The caller owns parsing + fallbacks. */
export async function conversePrompt(
  promptArn: string,
  variables: Record<string, string>,
  maxTokens = 800
): Promise<string> {
  void maxTokens;
  const started = Date.now();
  try {
    const promptVariables: Record<string, { text: string }> = {};
    for (const [k, v] of Object.entries(variables)) promptVariables[k] = { text: v };
    const res = await bedrock.send(
      new ConverseCommand({
        modelId: promptArn,
        promptVariables,
      })
    );
    log(`CONVERSE_OK ms=${Date.now() - started} prompt=${promptArn.split("/").pop()}`);
    const first: ContentBlock | undefined = res.output?.message?.content?.[0];
    return first && "text" in first ? (first.text ?? "") : "";
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "Unknown";
    log(`CONVERSE_FAIL name=${name} prompt=${promptArn.split("/").pop()} err=${(err as Error)?.message}`);
    throw err;
  }
}
