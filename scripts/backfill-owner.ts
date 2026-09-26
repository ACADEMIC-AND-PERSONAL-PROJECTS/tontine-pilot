import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser, signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function main() {
  await signIn({ username: process.env.SEED_USER!, password: process.env.SEED_PASSWORD! });
  const me = await getCurrentUser();
  console.log("backfill as", me.userId);
  const groups = await client.models.Group.list();
  let g = 0;
  for (const grp of groups.data ?? []) {
    const row = grp as unknown as Record<string, unknown>;
    if (!row.ownerId) {
      await client.models.Group.update({ id: grp.id, ownerId: me.userId });
      g++;
    }
  }
  const members = await client.models.Member.list();
  let m = 0;
  for (const mem of members.data ?? []) {
    const row = mem as unknown as Record<string, unknown>;
    if (!row.ownerId) {
      await client.models.Member.update({ id: mem.id, ownerId: me.userId });
      m++;
    }
  }
  console.log(`BACKFILL_OK groups=${g} members=${m}`);
}

main().catch((e) => {
  console.error("BACKFILL_FAIL", e);
  process.exit(1);
});
