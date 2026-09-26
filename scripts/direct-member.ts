import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs);
const client = generateClient<Schema>();
async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const created = await client.models.Member.create({
    groupId: "group-1", name: "Direct Probe", email: `probe.${Date.now()}@exemple.sn`,
    phone: "+221770000000", trustScore: 90, lateCount: 0, cyclesCompleted: 1, notifySms: false,
  });
  console.log("created:", created.data?.id, "errors:", JSON.stringify(created.errors));
}
main().catch((e) => console.error("THROW", e));
