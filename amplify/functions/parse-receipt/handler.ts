import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  TextractClient,
  DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { VISION_PROFILE, extractJson, log } from "../_shared/bedrock";
import { textractParse } from "../_shared/receipt";
console.log("HANDLER_REV=3");

const client = dataClient();

const region = process.env.AWS_REGION ?? "us-east-1";
const bedrockRegion = process.env.BEDROCK_REGION ?? "us-east-1";
const s3 = new S3Client({ region });
const textract = new TextractClient({ region });
const bedrock = new BedrockRuntimeClient({ region: bedrockRegion, maxAttempts: 5, retryMode: "adaptive" });

async function readBytes(bucket: string, key: string): Promise<{ bytes: Uint8Array; format: "jpeg" | "png" }> {
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const c of out.Body as AsyncIterable<Uint8Array>) chunks.push(c);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.length;
  }
  const format = bytes[0] === 0x89 && bytes[1] === 0x50 ? "png" : "jpeg";
  return { bytes, format };
}

export const handler: Handler = async (event) => {
  const args = (event as { arguments?: { s3Key?: string; groupId?: string; bucket?: string } }).arguments ?? {};
  if (!args.s3Key || !args.groupId) throw new Error("VALIDATION: s3Key and groupId required");
  const bucket =
    args.bucket ?? process.env.STORAGE_BUCKET ?? (() => { throw new Error("CONFIG: bucket unknown"); })();

  const group = (await client.models.Group.get({ id: args.groupId })).data;
  if (!group) throw new Error("VALIDATION: unknown group");
  const openCycle = (
    await client.models.Cycle.list({ filter: { groupId: { eq: args.groupId }, status: { eq: "OPEN" } } })
  ).data[0];
  // Member roster for the strict recipient guard below.
  const memberNames = new Set(
    (
      await client.models.Member.list({ filter: { groupId: { eq: args.groupId } } })
    ).data.map((m) => m.name.toLowerCase())
  );

  const engine = process.env.OCR_ENGINE ?? "textract";
  if (engine === "bedrock" && (process.env.USE_MOCK ?? "true").toLowerCase() === "false") {
    try {
      const { bytes, format } = await readBytes(bucket, args.s3Key);
      const res = await bedrock.send(
        new ConverseCommand({
          modelId: VISION_PROFILE,
          messages: [{
            role: "user",
            content: [
              { image: { format, source: { bytes } } },
              { text: "You read West-African Mobile Money receipts (Wave, Orange Money, MTN). Return ONLY JSON: {\"amount\": <int FCFA>, \"transactionId\": \"<as printed or null>\", \"recipientName\": \"<or null>\", \"date\": \"<YYYY-MM-DD or null>\", \"provider\": \"<Wave|Orange Money|MTN|Unknown>\", \"confidence\": <0..1>}" },
            ],
          }],
          inferenceConfig: { maxTokens: 800, temperature: 0.2 },
        })
      );
      const first = res.output?.message?.content?.[0];
      const text = first && "text" in first ? (first.text ?? "") : "";
      const p = extractJson(text) as Record<string, unknown>;
      log("CONVERSE_OK vision receipt");
      // Honest failure: no readable amount -> null (never the standard
      // contribution). Recipient must be a group member or empty.
      const amount =
        typeof p.amount === "number" ? Math.round(p.amount) : null;
      const rawRec = ((p.recipientName as string) ?? "").trim();
      const cycleRec = openCycle?.recipientName ?? "";
      const recipientName =
        !rawRec || rawRec.toLowerCase() === cycleRec.toLowerCase()
          ? cycleRec
          : memberNames.has(rawRec.toLowerCase())
            ? (p.recipientName as string)
            : "";
      return {
        amount,
        transactionId: (p.transactionId as string) ?? null,
        recipientName,
        date: (p.date as string) ?? new Date().toISOString().slice(0, 10),
        provider: (p.provider as string) ?? "Unknown",
        confidence:
          typeof p.confidence === "number" ? p.confidence : amount ? 0.5 : 0.3,
      };
    } catch (err) {
      log(`FALLBACK: Bedrock vision failed (${(err as Error)?.message}), Textract next`);
    }
  }

  // Primary offline-capable path: Textract (no Bedrock quota needed).
  try {
    const { bytes } = await readBytes(bucket, args.s3Key);
    const det = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: bytes } })
    );
    const lines = (det.Blocks ?? [])
      .filter((b) => b.BlockType === "LINE" && b.Text)
      .map((b) => b.Text as string);
    log(`TEXTRACT_OK lines=${lines.length}`);
    return textractParse(lines, group.contributionAmount, openCycle?.recipientName ?? "");
  } catch (err) {
    log(`FALLBACK: Textract failed (${(err as Error)?.message}), unreadable receipt`);
    // Unreadable receipt: null amount so the UI offers manual entry instead
    // of recording a fabricated payment.
    return {
      amount: null,
      transactionId: null,
      recipientName: "",
      date: new Date().toISOString().slice(0, 10),
      provider: "Unknown",
      confidence: 0.3,
    };
  }
};
