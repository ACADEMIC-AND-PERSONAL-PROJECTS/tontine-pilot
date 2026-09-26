import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs);
const client = generateClient<Schema>();
async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const to = process.env.TEST_EMAIL!;
  const created = await client.models.Member.create({
    groupId: "group-1", name: "Inbox Test", email: to,
    phone: "+221770000000", trustScore: 90, lateCount: 0, cyclesCompleted: 1, notifySms: false,
  });
  const mid = created.data?.id;
  if (!mid) throw new Error("create failed");
  for (let i = 0; i < 8; i++) {
    const chk = await client.models.Member.list({ filter: { groupId: { eq: "group-1" } } });
    if ((chk.data ?? []).some((m) => m.id === mid)) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  const r = await client.queries.askAssistant({
    question: "Envoie un rappel à Inbox Test, il est en retard sur son paiement",
    locale: "fr",
  });
  console.log("ANSWER:", (r.data?.answer ?? `ERR:${JSON.stringify(r.errors)}`).slice(0, 250));
  await new Promise((r) => setTimeout(r, 4000));
  const alerts = await client.models.Alert.list({ filter: { memberId: { eq: mid } } });
  const after = await client.models.Member.get({ id: mid });
  console.log("alerts:", alerts.data?.length, "| trust:", JSON.stringify({ late: after.data?.lateCount, trust: after.data?.trustScore }));
  for (const a of alerts.data ?? []) await client.models.Alert.delete({ id: a.id });
  await client.models.Member.delete({ id: mid });
  console.log("CLEANED");
}
main().catch((e) => { console.error("THROW", e); process.exit(1); });
