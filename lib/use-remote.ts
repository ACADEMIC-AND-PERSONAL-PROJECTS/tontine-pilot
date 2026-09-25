"use client";

import { useEffect, useState } from "react";
import { client, isBackendEnabled } from "./backend";
import { toAlert, toContribution, toGroup } from "./remote";

type Row = Record<string, unknown>;
import type {
  Alert as FakeAlert,
  Contribution as FakeContribution,
  Group as FakeGroup,
} from "./fake-data";

export type CycleRow = {
  id: string;
  cycleNumber: number;
  recipientName: string;
  startDate: string;
  endDate: string;
  totalExpected: number;
  totalCollected: number;
};

export function useRemoteGroup(groupId: string): FakeGroup | null {
  const [group, setGroup] = useState<FakeGroup | null>(null);
  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    client.models.Group.get({ id: groupId }).then(
      ({ data }) => {
        if (live && data) {
          try {
            setGroup(toGroup(data as Row));
          } catch {
            // contract drift -> keep local
          }
        }
      },
      () => {}
    );
    return () => {
      live = false;
    };
  }, [groupId]);
  return group;
}

export function useRemoteCycleData(groupId: string): {
  cycle: CycleRow | null;
  contributions: FakeContribution[];
  alerts: FakeAlert[];
} {
  const [state, setState] = useState<{
    cycle: CycleRow | null;
    contributions: FakeContribution[];
    alerts: FakeAlert[];
  }>({ cycle: null, contributions: [], alerts: [] });

  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    (async () => {
      try {
        const cycles = await client.models.Cycle.list({
          filter: { groupId: { eq: groupId } },
        });
        const rows = (cycles.data ?? []) as Array<Record<string, unknown>>;
        const open =
          rows.find((c) => c.status === "OPEN") ??
          [...rows].sort(
            (a, b) => Number(b.cycleNumber ?? 0) - Number(a.cycleNumber ?? 0)
          )[0];
        if (!open) return;
        const [contribs, alerts] = await Promise.all([
          client.models.Contribution.list({ filter: { cycleId: { eq: open.id as string } } }),
          client.models.Alert.list({
            filter: { groupId: { eq: groupId }, resolved: { eq: false } },
          }),
        ]);
        if (!live) return;
        setState({
          cycle: {
            id: open.id as string,
            cycleNumber: Number(open.cycleNumber ?? 0),
            recipientName: (open.recipientName as string) ?? "",
            startDate: (open.startDate as string) ?? "",
            endDate: (open.endDate as string) ?? "",
            totalExpected: Number(open.totalExpected ?? 0),
            totalCollected: Number(open.totalCollected ?? 0),
          },
          contributions: (contribs.data ?? []).flatMap((r) => {
            try {
              return [toContribution(r as Row)];
            } catch {
              return [];
            }
          }),
          alerts: (alerts.data ?? []).flatMap((r) => {
            try {
              return [toAlert(r as Row)];
            } catch {
              return [];
            }
          }),
        });
      } catch {
        // offline / logged out -> callers keep fake data
      }
    })();
    return () => {
      live = false;
    };
  }, [groupId]);

  return state;
}
