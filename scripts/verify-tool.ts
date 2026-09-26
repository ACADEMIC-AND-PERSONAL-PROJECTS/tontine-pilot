import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const tag = Date.now().toString(36);
  const email = `testuser.${tag}@exemple.sn`;
  // remove leftovers from previous runs so the name is unambiguous (repeat:
  // list/delete is eventually consistent, one pass may miss rows)
  for (let round = 0; round < 5; round++) {
    const pre = await client.models.Member.list({ filter: { groupId: { eq: "group-1" } } });
    const dups = (pre.data ?? []).filter((m) => (m.name ?? "").toLowerCase() === "test user");
    if (dups.length === 0) break;
    for (const d of dups) {
      const al = await client.models.Alert.list({ filter: { memberId: { eq: d.id } } });
      for (const a of al.data ?? []) await client.models.Alert.delete({ id: a.id });
      await client.models.Member.delete({ id: d.id });
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
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
  // wait until the row is visible to LIST (eventual consistency), else the
  // assistant cannot resolve it
  for (let i = 0; i < 8; i++) {
    const chk = await client.models.Member.list({ filter: { groupId: { eq: "group-1" } } });
    if ((chk.data ?? []).some((m) => m.id === mid)) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Ask up to twice: the deterministic pre-route should fire, but a model
  // miss on the first attempt is retried rather than failed.
  let answer = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await client.queries.askAssistant({
      question: "Envoie un rappel à Test User, il est en retard sur son paiement",
      locale: "fr",
    });
    answer = r.data?.answer ?? `ERR:${JSON.stringify(r.errors)}`;
    console.log(`ANSWER attempt ${attempt + 1}:`, answer.slice(0, 120));
    if (/C'est (fait|noté)/.test(answer)) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  // NOTE: actual SES delivery is blocked in SES sandbox (unverified identities)
  // — assert the platform side-effects (alert + trust), not the inbox.
  await new Promise((r) => setTimeout(r, 3000));
  const dump = await client.models.Member.list({ filter: { groupId: { eq: "group-1" } } });
  for (const m of dump.data ?? []) {
    if (((m.name ?? "") as string).toLowerCase().includes("test")) {
      console.log("DUMP", m.id.slice(0, 8), m.name, "late=", m.lateCount, "trust=", m.trustScore);
    }
  }
  // poll: writes converge in seconds; a single read may be stale
  let after = await client.models.Member.get({ id: mid });
  for (let i = 0; i < 6 && (after.data?.lateCount ?? 0) === 0; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    after = await client.models.Member.get({ id: mid });
  }
  console.log(
    "trust after:",
    JSON.stringify({ late: after.data?.lateCount, trust: after.data?.trustScore })
  );
  const okTrust = after.data?.lateCount === 1;

  let alerts = await client.models.Alert.list({ filter: { memberId: { eq: mid } } });
  for (let i = 0; i < 6 && (alerts.data ?? []).length === 0; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    alerts = await client.models.Alert.list({ filter: { memberId: { eq: mid } } });
  }
  console.log("alerts for temp member:", alerts.data?.length);
  for (const a of alerts.data ?? []) {
    await client.mutations.resolveAlert({ alertId: a.id });
  }
  await client.models.Member.delete({ id: mid });
  console.log(okTrust && (alerts.data?.length ?? 0) > 0 ? "TOOL_E2E_PASS" : "TOOL_E2E_FAIL");
  if (!(okTrust && (alerts.data?.length ?? 0) > 0)) process.exitCode = 1;
}

main().catch((e) => {
  console.error("TOOL_E2E_THROW", e);
  process.exit(1);
});
