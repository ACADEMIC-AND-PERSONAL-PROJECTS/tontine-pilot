"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fakeGroup, seedGroups, type Group } from "@/lib/fake-data";

// Placeholder when a backend user owns zero groups: all zeros, never demo data.
export const EMPTY_GROUP: Group = {
  id: "",
  name: "",
  description: "",
  currency: "FCFA",
  contributionAmount: 0,
  frequency: "MONTHLY",
  memberCount: 0,
  currentCycleIndex: 0,
  createdAt: "",
  emergencyFundBalance: 0,
  emergencyFundTarget: 1,
  role: "Admin",
  cycleCollected: 0,
  cycleExpected: 1,
  openAlerts: 0,
  archived: false,
  startDate: "",
  endDate: "",
};
import { client, isBackendEnabled } from "@/lib/backend";
import { toGroup } from "@/lib/remote";
import { getCurrentUser } from "aws-amplify/auth";

const keyFor = (base: string, userId: string | null) =>
  userId ? `${base}-${userId}` : base;

type Ctx = {
  groups: Group[];
  activeId: string;
  active: Group;
  ready: boolean;
  synced: boolean;
  hasGroups: boolean;
  userId: string | null;
  switchGroup: (id: string) => void;
  addGroup: (g: Group) => Promise<boolean>;
  archiveGroup: (id: string, archived: boolean) => void;
  removeGroup: (id: string) => void;
};

const GroupsContext = createContext<Ctx | null>(null);

function load(userId: string | null): { groups: Group[]; activeId: string } | null {
  try {
    const raw = localStorage.getItem(keyFor("tp-groups", userId));
    const activeId =
      localStorage.getItem(keyFor("tp-active-group", userId)) || fakeGroup.id;
    if (!raw) return null;
    const groups = JSON.parse(raw) as Group[];
    if (!Array.isArray(groups) || groups.length === 0) return null;
    return { groups, activeId };
  } catch {
    return null;
  }
}

function union(local: Group[], remote: Group[]): Group[] {
  const byId = new Map(local.map((g) => [g.id, g]));
  for (const g of remote) byId.set(g.id, g); // remote wins on conflict
  return [...byId.values()];
}

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const backendOn = isBackendEnabled();
  // Offline/demo mode keeps the shared seed cache; logged-in users get a
  // per-account cache so two accounts never see each other's groups.
  const [userId, setUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window === "undefined" || backendOn) return [];
    const saved = load(null);
    return saved?.groups ?? seedGroups;
  });
  const [activeId, setActiveId] = useState<string>(fakeGroup.id);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);

  // Identify account, then hydrate its cache.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!backendOn) {
        if (live) setReady(true);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!live) return;
        setUserId(user.userId);
        const saved = load(user.userId);
        if (saved) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- per-account cache hydration
          setGroups(saved.groups);
          if (saved.groups.some((g) => g.id === saved.activeId)) {
            setActiveId(saved.activeId);
          }
        }
      } catch {
        // logged out -> empty until login
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remote sync: owner-scoped rows UNION local cache (never clobber —
  // covers offline creates + read-after-write races). Empty remote + empty
  // cache = genuinely new user -> empty onboarding, never demo data.
  useEffect(() => {
    if (!backendOn || !ready) return;
    let live = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        const { data, errors } = await client.models.Group.list({
          filter: { owner: { eq: user.userId } },
        });
        if (!live) return;
        if (!errors?.length && data) {
          const remote: Group[] = [];
          for (const r of data as Record<string, unknown>[]) {
            try {
              remote.push(toGroup(r));
            } catch {
              // skip bad row
            }
          }
          setGroups((prev) => union(prev, remote));
        }
      } catch {
        // logged out / offline -> keep local cache
      } finally {
        if (live) setSynced(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [backendOn, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(keyFor("tp-groups", userId), JSON.stringify(groups));
      localStorage.setItem(keyFor("tp-active-group", userId), activeId);
    } catch {
      // storage unavailable — demo still works in memory
    }
  }, [groups, activeId, ready, userId]);

  const switchGroup = useCallback(
    (id: string) => {
      setActiveId(id);
      try {
        localStorage.setItem(keyFor("tp-active-group", userId), id);
      } catch {
        // ignore
      }
    },
    [userId]
  );

  // Awaited: returns false when the remote write fails so the caller can
  // show an error instead of a fake success. Local cache always updates.
  const addGroup = useCallback(
    async (g: Group): Promise<boolean> => {
      setGroups((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
      setActiveId(g.id);
      if (!backendOn) return true;
      try {
        const { errors } = await client.models.Group.create({
          id: g.id,
          name: g.name,
          description: g.description,
          descriptionEn: g.descriptionEn,
          currency: g.currency,
          contributionAmount: g.contributionAmount,
          frequency: g.frequency,
          memberCount: g.memberCount,
          currentCycleIndex: g.currentCycleIndex,
          emergencyFundBalance: g.emergencyFundBalance,
          emergencyFundTarget: g.emergencyFundTarget,
          role: g.role,
          cycleCollected: g.cycleCollected,
          cycleExpected: g.cycleExpected,
          openAlerts: g.openAlerts,
          archived: false,
        });
        return !errors?.length;
      } catch {
        return false;
      }
    },
    [backendOn]
  );

  const archiveGroup = useCallback(
    (id: string, archived: boolean) => {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, archived } : g)));
      if (backendOn) {
        client.models.Group.update({ id, archived }).catch(() => {});
      }
    },
    [backendOn]
  );

  const removeGroup = useCallback(
    (id: string) => {
      setGroups((prev) => {
        const next = prev.filter((g) => g.id !== id);
        if (next.length === 0) return prev;
        if (activeId === id) setActiveId(next[0].id);
        return next;
      });
      if (backendOn) {
        client.models.Group.delete({ id }).catch(() => {});
      }
    },
    [activeId, backendOn]
  );

  const active = useMemo(() => {
    const found = groups.find((g) => g.id === activeId) ?? groups[0];
    if (found) return found;
    if (backendOn && synced) return EMPTY_GROUP;
    return fakeGroup;
  }, [groups, activeId, backendOn, synced]);

  const value = useMemo(
    () => ({
      groups,
      activeId,
      active,
      ready,
      synced,
      hasGroups: groups.length > 0,
      userId,
      switchGroup,
      addGroup,
      archiveGroup,
      removeGroup,
    }),
    [groups, activeId, active, ready, synced, userId, switchGroup, addGroup, archiveGroup, removeGroup]
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within GroupsProvider");
  return ctx;
}
