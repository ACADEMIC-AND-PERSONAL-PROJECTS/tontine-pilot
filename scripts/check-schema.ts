import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs);
const client = generateClient<Schema>();
async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const r = await client.models.Group.update({ id: "group-1", ownerId: "probe" });
  console.log("update errors:", JSON.stringify(r.errors));
  console.log("ownerId now:", (r.data as Record<string, unknown> | null)?.ownerId);
  if ((r.data as Record<string, unknown> | null)?.ownerId === "probe") {
    await client.models.Group.update({ id: "group-1", ownerId: "c4488458-6071-7035-83d3-e282966535eb" });
    console.log("SCHEMA_OWNERID_LIVE");
  } else console.log("SCHEMA_OWNERID_MISSING");
}
main().catch((e) => console.error("THREW", e));
