import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

const ok = (name: string, cond: boolean, extra?: unknown) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`, extra ?? "");
  if (!cond) process.exitCode = 1;
};

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  console.log("signed in");

  const p = await client.queries.parseDeclaration({
    text: "Moussa a payé 20000 pour Cheikh",
    groupId: "group-1",
  });
  ok("parseDeclaration", !p.errors?.length && p.data?.amount === 20000, p.data);
  ok("parseDeclaration.member", p.data?.memberId === "m2", p.data?.memberName);

  const r = await client.queries.recommendRotationOp({ groupId: "group-1" });
  const entries = r.data?.entries ?? [];
  ok("rotation.count", entries.length === 12, entries.length);
  ok(
    "rotation.ibrahima-last",
    entries[entries.length - 1]?.name === "Ibrahima Sow",
    entries[entries.length - 1]?.name
  );
  ok("rotation.reasons-bilingual", Boolean(entries[0]?.reason && entries[0]?.reasonEn));

  const d = await client.queries.buildDigest({ cycleId: "cycle-4", locale: "fr" });
  ok("digest.script", Boolean(d.data?.script?.includes("Bilan cycle 4")), d.data?.script?.slice(0, 40));
  ok("digest.no-audio-yet", d.data?.audioUrl === "", "USE_POLLY=false as expected");

  const n = await client.mutations.sendNudge({ alertId: "a2" });
  ok("sendNudge.mock", n.data?.sentEmail === true, n.data);

  const dn = await client.queries.draftNudge({ alertId: "a1", locale: "fr" });
  ok("draftNudge", Boolean(dn.data?.message?.includes("Ibrahima")), dn.data?.message?.slice(0, 50));
}

main().catch((e) => {
  console.error("VERIFY_FAIL", e);
  process.exit(1);
});
