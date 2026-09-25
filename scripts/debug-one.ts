import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const p = await client.queries.parseDeclaration({ text: "J'ai payé 20000", groupId: "group-1" });
  console.log("DATA:", JSON.stringify(p.data));
  console.log("ERRORS:", JSON.stringify(p.errors));
  console.log("EXT:", JSON.stringify((p as Record<string, unknown>).extensions));
}

main().catch((e) => console.error("THREW", e));
