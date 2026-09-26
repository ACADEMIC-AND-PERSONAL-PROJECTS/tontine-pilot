import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs as never);
async function main() {
  try { await signOut(); } catch { /* noop */ }
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  console.log("SIGNIN_OK");
}
main().catch((e) => console.error("SIGNIN_FAIL", (e as Error)?.name, (e as Error)?.message));
