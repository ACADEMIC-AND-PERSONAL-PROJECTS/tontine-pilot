import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const key = process.env.RECEIPT_KEY!;
  const r = await client.queries.parseReceipt({ s3Key: key, groupId: "group-1" });
  console.log("DATA:", JSON.stringify(r.data));
  console.log("ERRORS:", JSON.stringify(r.errors));
  const d = r.data;
  const pass =
    !r.errors?.length && d?.amount === 20000 && (d?.provider === "Wave" || (d?.confidence ?? 0) >= 0.4);
  console.log(pass ? "OCR_E2E_PASS" : "OCR_E2E_FAIL");
  if (!pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error("OCR_E2E_THROW", e);
  process.exit(1);
});
