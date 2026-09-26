// Trust-score engine (single source of truth).
// Formula: base 92, -7 per late, +1 per completed cycle (capped +6), clamped 50..99.
export function recomputeTrust(lateCount: number, cycles: number): number {
  return Math.max(50, Math.min(99, 92 - lateCount * 7 + Math.min(6, cycles)));
}

type ModelsLike = {
  Member: {
    get: (a: { id: string }) => Promise<{ data: unknown }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (a: any) => Promise<unknown>;
  };
};

/** Record one late event on a member: lateCount+1 + trust recompute + persist. */
export async function applyLateEvent(
  models: ModelsLike,
  memberId: string
): Promise<{ lateCount: number; trustScore: number } | null> {
  const found = (await models.Member.get({ id: memberId })).data as {
    lateCount?: number | null;
    cyclesCompleted?: number | null;
  } | null;
  if (!found) return null;
  const lateCount = (found.lateCount ?? 0) + 1;
  const trustScore = recomputeTrust(lateCount, found.cyclesCompleted ?? 0);
  await models.Member.update({ id: memberId, lateCount, trustScore });
  return { lateCount, trustScore };
}
