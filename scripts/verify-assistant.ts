import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  for (const [q, locale] of [
    ["Comment déclarer une cotisation ?", "fr"],
    ["What is the emergency fund?", "en"],
    ["C'est quoi ton plat préféré ?", "fr"],
  ] as Array<[string, string]>) {
    const r = await client.queries.askAssistant({ question: q, locale });
    console.log(`Q(${locale}):`, q);
    console.log(`A:`, (r.data?.answer ?? `ERR:${JSON.stringify(r.errors)}`).slice(0, 220));
    console.log("---");
  }
}

main().catch((e) => {
  console.error("ASSISTANT_FAIL", e);
  process.exit(1);
});
