import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();
const KEEP = new Set(["a1", "a2", "a3", "a4", "a5"]);

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const all = await client.models.Alert.list({ filter: { groupId: { eq: "group-1" } } });
  const junk = (all.data ?? []).filter((a) => !KEEP.has(a.id));
  console.log(`found ${junk.length} junk alert(s)`);
  for (const j of junk) {
    console.log("deleting", j.id, j.type, j.memberName);
    await client.models.Alert.delete({ id: j.id });
  }
  console.log("CLEANUP_DONE");
}

main().catch((e) => {
  console.error("CLEANUP_FAIL", e);
  process.exit(1);
});
