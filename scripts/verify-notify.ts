import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  // Sandbox SES rejects unverified recipients -> expect graceful skipped counts.
  const r = await client.mutations.notifyNewGroup({ groupId: "group-1" });
  console.log("DATA:", JSON.stringify(r.data));
  console.log("ERRORS:", JSON.stringify(r.errors));
  const ok = !r.errors?.length && (r.data?.sent ?? -1) >= 0 && (r.data?.skipped ?? -1) >= 0;
  console.log(ok ? "NOTIFY_PASS" : "NOTIFY_FAIL");
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error("NOTIFY_THROW", e);
  process.exit(1);
});
