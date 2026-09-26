import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs);
const client = generateClient<Schema>();
const KEEP_ALERTS = new Set(["a1", "a2", "a3", "a4", "a5"]);
async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const al = await client.models.Alert.list({ filter: { groupId: { eq: "group-1" } } });
  let da = 0;
  for (const a of al.data ?? []) {
    if (!KEEP_ALERTS.has(a.id)) {
      await client.models.Alert.delete({ id: a.id });
      console.log("del alert", a.id.slice(0, 8), a.memberName);
      da++;
    }
  }
  const ms = await client.models.Member.list({ filter: { groupId: { eq: "group-1" } } });
  let dm = 0;
  for (const m of ms.data ?? []) {
    const n = (m.name ?? "").toLowerCase();
    if (n.includes("test") || n.includes("inbox")) {
      const aa = await client.models.Alert.list({ filter: { memberId: { eq: m.id } } });
      for (const x of aa.data ?? []) await client.models.Alert.delete({ id: x.id });
      await client.models.Member.delete({ id: m.id });
      console.log("del member", m.name);
      dm++;
    }
  }
  console.log(`CLEANED alerts=${da} members=${dm}`);
}
main().catch((e) => { console.error("THROW", e); process.exit(1); });
