import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import {
  fakeAlerts,
  fakeContributions,
  fakeMembers,
  fakeGroup,
  seedGroups,
  pastCycles,
  currentCycle,
} from "../lib/fake-data";
import { dedupeKey } from "../amplify/functions/_shared/fallbacks";

Amplify.configure(outputs);
const client = generateClient<Schema>();

const emailBase = process.env.SEED_EMAIL_BASE ?? "";
const remap = (email: string) => {
  if (!emailBase) return email;
  const [user, domain] = emailBase.split("@");
  const local = email.split("@")[0].replace(/[^a-z0-9]/gi, ".");
  return `${user}+${local}@${domain}`;
};

type AnyModel = {
  get: (a: { id: string }) => Promise<{ data: unknown }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (a: any) => Promise<unknown>;
};

async function upsertModel(
  model: string,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any
) {
  const m = (client.models as unknown as Record<string, AnyModel>)[model];
  const existing = await m.get({ id });
  if (existing.data) {
    console.log(`  keep ${String(model)} ${id}`);
    return;
  }
  await m.create({ id, ...values });
  console.log(`  + ${String(model)} ${id}`);
}

async function main() {
  const user = process.env.SEED_USER;
  const pass = process.env.SEED_PASSWORD;
  if (!user || !pass) throw new Error("SEED_USER and SEED_PASSWORD env required");
  await signIn({ username: user, password: pass });
  console.log("signed in as", user);

  let g = 0,
    m = 0,
    cy = 0,
    c = 0,
    a = 0;
  for (const grp of seedGroups) {
    await upsertModel("Group", grp.id, {
      name: grp.name,
      description: grp.description,
      descriptionEn: grp.descriptionEn,
      currency: grp.currency,
      contributionAmount: grp.contributionAmount,
      frequency: grp.frequency,
      memberCount: grp.memberCount,
      currentCycleIndex: grp.currentCycleIndex,
      emergencyFundBalance: grp.emergencyFundBalance,
      emergencyFundTarget: grp.emergencyFundTarget,
      role: grp.role,
      cycleCollected: grp.cycleCollected,
      cycleExpected: grp.cycleExpected,
      openAlerts: grp.openAlerts,
      archived: false,
      startDate: grp.startDate,
      endDate: grp.endDate,
    });
    g++;
  }
  for (const mem of fakeMembers) {
    await upsertModel("Member", mem.id, {
      groupId: fakeGroup.id,
      name: mem.name,
      email: remap(mem.email),
      phone: mem.phone,
      trustScore: mem.trustScore,
      lateCount: mem.lateCount ?? 0,
      cyclesCompleted: 4,
      notifySms: false,
      ownerId,
    });
    m++;
  }
  const cycles = [...pastCycles, currentCycle];
  for (const cyc of cycles) {
    await upsertModel("Cycle", cyc.id, {
      groupId: fakeGroup.id,
      cycleNumber: cyc.cycleNumber,
      recipientMemberId: cyc.recipientMemberId,
      recipientName: cyc.recipientName,
      startDate: cyc.startDate,
      endDate: cyc.endDate,
      status: cyc.status,
      totalExpected: cyc.totalExpected,
      totalCollected: cyc.totalCollected,
    });
    cy++;
  }
  for (const con of fakeContributions) {
    await upsertModel("Contribution", con.id, {
      groupId: fakeGroup.id,
      cycleId: currentCycle.id,
      memberId: con.memberId,
      memberName: con.memberName,
      amount: con.amount,
      status: con.status,
      dateDeclared: con.dateDeclared || undefined,
      rawText: con.rawText || undefined,
      rawTextEn: con.rawTextEn || undefined,
      method: con.method || undefined,
      transactionId: con.transactionId || undefined,
    });
    c++;
  }
  for (const al of fakeAlerts) {
    await upsertModel("Alert", al.id, {
      groupId: fakeGroup.id,
      cycleId: currentCycle.id,
      memberId: al.memberId,
      memberName: al.memberName,
      type: al.type,
      message: al.message,
      messageEn: al.messageEn,
      createdAt: `${al.createdAt}T08:00:00.000Z`,
      resolved: al.resolved,
      proposalKind: al.proposal?.kind,
      proposalDetails: al.proposal?.details,
      proposalDetailsEn: al.proposal?.detailsEn,
      dedupeKey: dedupeKey(fakeGroup.id, currentCycle.id, al.memberId, al.type),
    });
    a++;
  }
  console.log(`SEED OK: g=${g} m=${m} cy=${cy} c=${c} a=${a}`);
}

main().catch((e) => {
  console.error("SEED_FAIL", e);
  process.exit(1);
});
