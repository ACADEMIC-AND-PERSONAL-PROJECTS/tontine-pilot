import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const d = await client.queries.buildDigest({ cycleId: "cycle-4", locale: "fr" });
  console.log("DATA:", JSON.stringify(d.data)?.slice(0, 200));
  console.log("ERRORS:", JSON.stringify(d.errors));
}

main().catch((e) => console.error("THREW", e));
