import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const email = `testuser${Date.now()}@exemple.sn`;
  const created = await client.models.Member.create({
    groupId: "group-1",
    name: "Test User",
    email,
    phone: "+221770000000",
    trustScore: 92,
    lateCount: 0,
    cyclesCompleted: 2,
    notifySms: false,
  });
  const mid = created.data?.id;
  if (!mid) throw new Error("member create failed");
  console.log("temp member:", mid);

  const r = await client.queries.askAssistant({
    question: "Envoie un rappel à Test User, il est en retard sur son paiement",
    locale: "fr",
  });
  console.log("ANSWER:", (r.data?.answer ?? `ERR:${JSON.stringify(r.errors)}`).slice(0, 300));

  const after = await client.models.Member.get({ id: mid });
  console.log(
    "trust after:",
    JSON.stringify({ late: after.data?.lateCount, trust: after.data?.trustScore })
  );
  const okTrust = after.data?.lateCount === 1;

  const alerts = await client.models.Alert.list({ filter: { memberId: { eq: mid } } });
  console.log("alerts for temp member:", alerts.data?.length);
  for (const a of alerts.data ?? []) {
    await client.models.Alert.delete({ id: a.id });
  }
  await client.models.Member.delete({ id: mid });
  console.log(okTrust && (alerts.data?.length ?? 0) > 0 ? "TOOL_E2E_PASS" : "TOOL_E2E_FAIL");
  if (!(okTrust && (alerts.data?.length ?? 0) > 0)) process.exitCode = 1;
}

main().catch((e) => {
  console.error("TOOL_E2E_THROW", e);
  process.exit(1);
});
