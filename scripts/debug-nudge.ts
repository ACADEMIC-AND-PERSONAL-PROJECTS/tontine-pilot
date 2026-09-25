import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const a = await client.models.Alert.get({ id: "a2" });
  console.log("alert:", JSON.stringify(a.data)?.slice(0, 200), "errors:", JSON.stringify(a.errors));
  const m = await client.models.Member.get({ id: "m12" });
  console.log("member:", JSON.stringify(m.data)?.slice(0, 200), "errors:", JSON.stringify(m.errors));
}

main().catch((e) => console.error("THREW", e));
