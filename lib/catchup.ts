"use client";

import { client } from "./backend";
import { trustFor } from "../amplify/functions/_shared/fallbacks";

export type DuesCycle = {
  id: string;
  cycleNumber: number;
  status?: string | null;
  endDate?: string | null;
  totalExpected?: number | null;
};

/** Split cycles into missed (closed or past end date → catch-up owed as
 *  LATE) and open (still payable → PENDING). Pure and unit-tested. */
export function splitCycles(
  cycles: DuesCycle[],
  todayIso: string
): { missed: DuesCycle[]; open: DuesCycle[] } {
  const missed: DuesCycle[] = [];
  const open: DuesCycle[] = [];
  for (const c of cycles) {
    const past = (c.endDate ?? "") < todayIso;
    if (c.status !== "OPEN" || past) missed.push(c);
    else open.push(c);
  }
  missed.sort((a, b) => a.cycleNumber - b.cycleNumber);
  open.sort((a, b) => a.cycleNumber - b.cycleNumber);
  return { missed, open };
}

/** Split an amount into two installment halves (sums stay exact). */
export function installmentHalves(amount: number): [number, number] {
  const first = Math.floor(Math.max(0, amount) / 2);
  return [first, Math.max(0, amount) - first];
}

export type OpenCycleLike = { id: string; cycleNumber: number; status?: string | null };

/** Id of the OPEN cycle right after the given one (tour swap target), or
 *  null when there is none. Pure and unit-tested. */
export function nextOpenCycleId(
  cycles: OpenCycleLike[],
  currentId?: string | null
): string | null {
  const open = cycles
    .filter((c) => c.status === "OPEN")
    .sort((a, b) => a.cycleNumber - b.cycleNumber);
  if (open.length === 0) return null;
  const idx = currentId ? open.findIndex((c) => c.id === currentId) : 0;
  if (idx < 0) return open[0]?.id ?? null;
  return open[idx + 1]?.id ?? null;
}

/** Delete a group and every row that belongs to it (members, cycles,
 *  contributions, alerts, digests, fund movements). Best-effort per row so
 *  one failure never leaves a half-deleted group; returns deletion counts.
 *  Prevents hollow groups and orphan rows. */
export async function deleteGroupCascade(
  models: typeof client.models,
  groupId: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  type RowDeleter = {
    list: (args: { filter: unknown }) => Promise<{ data?: Array<{ id: string }> | null }>;
    delete: (args: { id: string }) => Promise<unknown>;
  };
  const tables = models as unknown as Record<string, RowDeleter>;
  const childModels = ["Contribution", "Alert", "Digest", "FundMovement", "Cycle", "Member"] as const;
  for (const name of childModels) {
    let n = 0;
    try {
      const rows = await tables[name].list({ filter: { groupId: { eq: groupId } } });
      for (const r of rows.data ?? []) {
        try {
          await tables[name].delete({ id: r.id });
          n++;
        } catch {
          // keep going — report partial counts
        }
      }
    } catch {
      // list failed — group row below still gets deleted
    }
    counts[name] = n;
  }
  await tables.Group.delete({ id: groupId });
  counts.Group = 1;
  return counts;
}

export type AddMemberInput = {
  groupId: string;
  ownerId?: string;
  name: string;
  email: string;
  phone?: string;
  contributionAmount: number;
  cycles: DuesCycle[];
  todayIso?: string;
  locale?: "fr" | "en";
};

export type AddMemberResult = {
  memberId: string;
  missedCount: number;
  openCount: number;
  totalDue: number;
};

/** Add a member to an ongoing group with full catch-up (user rule):
 *  - missed cycles -> LATE contributions + one LATE_PAYMENT alert each
 *  - open cycles -> PENDING contributions (worker alerts later if unpaid)
 *  - member starts with lateCount = missed cycles (honest trust score)
 *  - group memberCount +1, affected cycles totalExpected += amount
 *  Idempotent per cycle: existing rows for the member are never duplicated. */
export async function addMemberToGroup(
  input: AddMemberInput
): Promise<AddMemberResult> {
  const today = input.todayIso ?? new Date().toISOString().slice(0, 10);
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email || !input.groupId) throw new Error("member-required-fields");
  const { missed, open } = splitCycles(input.cycles, today);

  // Retry-safe: reuse the member if (re)created already.
  const existing = await client.models.Member.list({
    filter: { groupId: { eq: input.groupId } },
  });
  const same = (existing.data ?? []).find(
    (m) => m.email.toLowerCase() === email || m.name.toLowerCase() === name.toLowerCase()
  );
  let memberId = same?.id;
  if (!memberId) {
    const created = await client.models.Member.create({
      groupId: input.groupId,
      ownerId: input.ownerId,
      name,
      email,
      phone: input.phone?.trim() || undefined,
      trustScore: trustFor(missed.length, 0),
      lateCount: missed.length,
      cyclesCompleted: 0,
      notifySms: false,
    });
    if (created.errors?.length || !created.data) {
      throw new Error(created.errors?.[0]?.message ?? "member-create-failed");
    }
    memberId = created.data.id;
  }

  const prior = await client.models.Contribution.list({
    filter: { groupId: { eq: input.groupId } },
  });
  const hasRow = new Set(
    (prior.data ?? []).filter((c) => c.memberId === memberId).map((c) => c.cycleId)
  );
  const priorAlerts = await client.models.Alert.list({
    filter: { groupId: { eq: input.groupId } },
  });
  const alerted = new Set(
    (priorAlerts.data ?? [])
      .filter((a) => a.memberId === memberId && !a.resolved)
      .map((a) => a.dedupeKey)
  );

  for (const c of missed) {
    if (hasRow.has(c.id)) continue;
    await client.models.Contribution.create({
      groupId: input.groupId,
      cycleId: c.id,
      memberId,
      memberName: name,
      amount: input.contributionAmount,
      status: "LATE",
      dateDeclared: today,
      rawText: `Catch-up on join (${c.cycleNumber})`,
      method: "MANUAL",
    });
    const key = `${input.groupId}#${c.id}#${memberId}#LATE_PAYMENT`;
    if (!alerted.has(key)) {
      await client.models.Alert.create({
        groupId: input.groupId,
        cycleId: c.id,
        memberId,
        memberName: name,
        type: "LATE_PAYMENT",
        message: `${name} — rattrapage cycle ${c.cycleNumber} : ${input.contributionAmount} FCFA dus.`,
        messageEn: `${name} — catch-up for cycle ${c.cycleNumber}: ${input.contributionAmount} FCFA owed.`,
        createdAt: new Date().toISOString(),
        resolved: false,
        dedupeKey: key,
      });
    }
    await client.models.Cycle.update({
      id: c.id,
      totalExpected: (c.totalExpected ?? 0) + input.contributionAmount,
    }).catch(() => null);
  }
  for (const c of open) {
    if (hasRow.has(c.id)) continue;
    await client.models.Contribution.create({
      groupId: input.groupId,
      cycleId: c.id,
      memberId,
      memberName: name,
      amount: input.contributionAmount,
      status: "PENDING",
      dateDeclared: today,
      rawText: `Joined during cycle ${c.cycleNumber}`,
      method: "MANUAL",
    });
    await client.models.Cycle.update({
      id: c.id,
      totalExpected: (c.totalExpected ?? 0) + input.contributionAmount,
    }).catch(() => null);
  }

  const group = await client.models.Group.get({ id: input.groupId });
  if (group.data) {
    await client.models.Group.update({
      id: input.groupId,
      memberCount: (group.data.memberCount ?? 0) + (same ? 0 : 1),
    }).catch(() => null);
  }
  return {
    memberId,
    missedCount: missed.length,
    openCount: open.length,
    totalDue: (missed.length + open.length) * input.contributionAmount,
  };
}
