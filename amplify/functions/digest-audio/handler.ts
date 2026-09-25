import type { Handler } from "aws-lambda";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/digest-audio";
import type { Schema } from "../../data/resource";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { log } from "../_shared/bedrock";
import { scriptFor } from "../_shared/digest";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const region = process.env.AWS_REGION ?? "eu-west-1";
const polly = new PollyClient({ region });
const s3 = new S3Client({ region });

export const handler: Handler = async (event) => {
  const args = (event as { arguments?: { cycleId?: string; locale?: string; bucket?: string } }).arguments ?? {};
  if (!args.cycleId) throw new Error("VALIDATION: cycleId required");
  const locale = args.locale === "en" ? "en" : "fr";

  const cycle = (await client.models.Cycle.get({ id: args.cycleId })).data;
  if (!cycle) throw new Error("VALIDATION: unknown cycle");
  const group = (await client.models.Group.get({ id: cycle.groupId })).data;
  const contribs = (
    await client.models.Contribution.list({ filter: { cycleId: { eq: cycle.id } } })
  ).data;
  const ok = contribs.filter((c) => c.status === "CONFIRMED").length;
  const late = contribs.filter((c) => c.status === "LATE").length;
  const pending = contribs.filter(
    (c) => c.status === "PENDING" || c.status === "COVERED_BY_EMERGENCY_FUND"
  ).length;

  const script = scriptFor(
    locale, cycle.cycleNumber, group?.name ?? "", cycle.recipientName ?? "",
    cycle.totalCollected, cycle.totalExpected, ok, late, pending,
    group?.emergencyFundBalance ?? 0
  );

  if ((process.env.USE_POLLY ?? "false").toLowerCase() !== "true") {
    log("FALLBACK: USE_POLLY=false, script only (frontend uses speechSynthesis)");
    return { script, audioUrl: "" };
  }
  const bucket =
    args.bucket ?? process.env.STORAGE_BUCKET ?? (() => { throw new Error("CONFIG: bucket unknown"); })();
  const key = `digests/${cycle.id}/${locale}.mp3`;
  const synth = await polly.send(
    new SynthesizeSpeechCommand({
      Engine: "neural",
      LanguageCode: locale === "fr" ? "fr-FR" : "en-US",
      VoiceId: locale === "fr" ? "Lea" : "Joanna",
      OutputFormat: "mp3",
      Text: script,
    })
  );
  const chunks: Uint8Array[] = [];
  for await (const c of synth.AudioStream as AsyncIterable<Uint8Array>) chunks.push(c);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const body = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    body.set(c, off);
    off += c.length;
  }
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "audio/mpeg" }));
  const url = await getSignedUrl(new S3Client({ region }), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  await client.models.Digest.create({
    groupId: cycle.groupId, cycleId: cycle.id, locale,
    script, audioKey: key, createdAt: new Date().toISOString(),
  });
  log(`POLLY_OK key=${key}`);
  return { script, audioUrl: url };
};
