import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs);
const client = generateClient<Schema>();
async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  for (const q of ["comment utiliser cette plateforme ?", "What is the emergency fund?"]) {
    const r = await client.queries.askAssistant({ question: q, locale: "en" });
    console.log("Q:", q);
    console.log("A:", (r.data?.answer ?? "ERR").slice(0, 150).replace(/\n/g, " "));
    console.log("---");
  }
}
main().catch((e) => console.error("THROW", e));
