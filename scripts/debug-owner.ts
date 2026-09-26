import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn, fetchAuthSession } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const s = await fetchAuthSession();
  console.log("tokens sub:", (s.tokens?.idToken?.payload as Record<string, unknown>)?.sub);
  const all = await client.models.Group.list();
  const filtered = await client.models.Group.list({
    filter: { owner: { eq: "c4488458-6071-7035-83d3-e282966535eb" } },
  });
  console.log("filtered count:", filtered.data?.length, "errors:", JSON.stringify(filtered.errors));
  for (const g of all.data ?? []) {
    console.log(g.id, "| owner=", (g as Record<string, unknown>).owner);
  }
}

main().catch((e) => console.error("THREW", e));
