import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser, signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

// Scoped ownerId backfill: ONLY rows whose `owner` is my own sub get
// ownerId stamped. Never touches other users' rows (unlike a blind
// unfiltered backfill). Safe to run as any user:
//   SEED_USER=... SEED_PASSWORD=... npx tsx scripts/backfill-owned.ts
Amplify.configure(outputs as any);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const me = await getCurrentUser();
  console.log("backfill as", me.userId);
  let fixed = 0;
  const groups = await client.models.Group.list({ limit: 200 });
  for (const g of groups.data ?? []) {
    const row = g as unknown as Record<string, unknown>;
    if (!row.ownerId && row.owner === me.userId) {
      await client.models.Group.update({ id: g.id, ownerId: me.userId });
      fixed++;
    }
  }
  const members = await client.models.Member.list({ limit: 500 });
  for (const m of members.data ?? []) {
    const row = m as unknown as Record<string, unknown>;
    if (!row.ownerId && row.owner === me.userId) {
      await client.models.Member.update({ id: m.id, ownerId: me.userId });
      fixed++;
    }
  }
  const cycles = await client.models.Cycle.list({ limit: 500 });
  for (const c of cycles.data ?? []) {
    const row = c as unknown as Record<string, unknown>;
    if (!row.ownerId && row.owner === me.userId) {
      await client.models.Cycle.update({ id: c.id, ownerId: me.userId });
      fixed++;
    }
  }
  console.log("BACKFILL_SCOPED fixed =", fixed);
}

main().catch((e) => console.error("THREW", e));
