"use client";

import { useEffect, useState } from "react";
import { client, isBackendEnabled } from "./backend";
import { toAlert, toContribution, toGroup, toMember } from "./remote";
import type {
  Alert as FakeAlert,
  Contribution as FakeContribution,
  Group as FakeGroup,
  Member as FakeMember,
} from "./fake-data";

type Row = Record<string, unknown>;

export type CycleRow = {
  id: string;
  cycleNumber: number;
  recipientName: string;
  startDate: string;
  endDate: string;
  totalExpected: number;
  totalCollected: number;
};

const toCycle = (c: Row): CycleRow => ({
  id: c.id as string,
  cycleNumber: Number(c.cycleNumber ?? 0),
  recipientName: (c.recipientName as string) ?? "",
  startDate: (c.startDate as string) ?? "",
  endDate: (c.endDate as string) ?? "",
  totalExpected: Number(c.totalExpected ?? 0),
  totalCollected: Number(c.totalCollected ?? 0),
});

export function useRemoteGroup(groupId: string): {
  group: FakeGroup | null;
  loaded: boolean;
} {
  const [state, setState] = useState<{ group: FakeGroup | null; loaded: boolean }>({
    group: null,
    loaded: false,
  });
  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    client.models.Group.get({ id: groupId }).then(
      ({ data, errors }) => {
        if (!live) return;
        if (!errors?.length && data) {
          try {
            setState({ group: toGroup(data as Row), loaded: true });
            return;
          } catch {
            // fall through
          }
        }
        setState({ group: null, loaded: true });
      },
      () => live && setState({ group: null, loaded: true })
    );
    return () => {
      live = false;
    };
  }, [groupId]);
  return state;
}

export function useRemoteMembers(groupId: string): {
  members: FakeMember[];
  loaded: boolean;
  refetch: () => void;
} {
  const [state, setState] = useState<{ members: FakeMember[]; loaded: boolean }>({
    members: [],
    loaded: false,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    client.models.Member.list({ filter: { groupId: { eq: groupId } } }).then(
      ({ data, errors }) => {
        if (!live) return;
        if (!errors?.length && data) {
          const out: FakeMember[] = [];
          for (const r of data as Row[]) {
            try {
              out.push(toMember(r));
            } catch {
              // skip bad row
            }
          }
          setState({ members: out, loaded: true });
          return;
        }
        setState({ members: [], loaded: true });
      },
      () => live && setState({ members: [], loaded: true })
    );
    return () => {
      live = false;
    };
  }, [groupId, tick]);
  return { ...state, refetch: () => setTick((t) => t + 1) };
}

export function useRemoteCycleData(groupId: string): {
  cycle: CycleRow | null;
  cycles: CycleRow[];
  contributions: FakeContribution[];
  alerts: FakeAlert[];
  loaded: boolean;
  refetch: () => void;
} {
  const [state, setState] = useState<{
    cycle: CycleRow | null;
    cycles: CycleRow[];
    contributions: FakeContribution[];
    alerts: FakeAlert[];
    loaded: boolean;
  }>({ cycle: null, cycles: [], contributions: [], alerts: [], loaded: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    (async () => {
      try {
        const res = await client.models.Cycle.list({
          filter: { groupId: { eq: groupId } },
        });
        const raw = ((res.data ?? []) as Row[]).map((c) => ({
          row: toCycle(c),
          status: c.status as string,
        }));
        raw.sort((a, b) => b.row.cycleNumber - a.row.cycleNumber);
        const cycles = raw.map((r) => r.row);
        const open = raw.find((r) => r.status === "OPEN")?.row ?? cycles[0] ?? null;
        const contributions: FakeContribution[] = [];
        const alerts: FakeAlert[] = [];
        if (open) {
          const [contribs, al] = await Promise.all([
            client.models.Contribution.list({ filter: { cycleId: { eq: open.id } } }),
            client.models.Alert.list({
              filter: { groupId: { eq: groupId }, resolved: { eq: false } },
            }),
          ]);
          for (const r of (contribs.data ?? []) as Row[]) {
            try {
              contributions.push(toContribution(r));
            } catch {
              // skip
            }
          }
          for (const r of (al.data ?? []) as Row[]) {
            try {
              alerts.push(toAlert(r));
            } catch {
              // skip
            }
          }
        }
        if (live) setState({ cycle: open, cycles, contributions, alerts, loaded: true });
      } catch {
        if (live)
          setState({ cycle: null, cycles: [], contributions: [], alerts: [], loaded: true });
      }
    })();
    return () => {
      live = false;
    };
  }, [groupId, tick]);

  return { ...state, refetch: () => setTick((t) => t + 1) };
}
