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
};
import { client, isBackendEnabled } from "@/lib/backend";
import { toGroup } from "@/lib/remote";
import { getCurrentUser } from "aws-amplify/auth";

const GROUPS_KEY = "tp-groups";
const ACTIVE_KEY = "tp-active-group";

type Ctx = {
  groups: Group[];
  activeId: string;
  active: Group;
  ready: boolean;
  synced: boolean;
  hasGroups: boolean;
  switchGroup: (id: string) => void;
  addGroup: (g: Group) => void;
  archiveGroup: (id: string, archived: boolean) => void;
  removeGroup: (id: string) => void;
};

const GroupsContext = createContext<Ctx | null>(null);

function load(): { groups: Group[]; activeId: string } | null {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    const activeId = localStorage.getItem(ACTIVE_KEY) || fakeGroup.id;
    if (!raw) return null;
    const groups = JSON.parse(raw) as Group[];
    if (!Array.isArray(groups) || groups.length === 0) return null;
    return { groups, activeId };
  } catch {
    return null;
  }
}

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<Group[]>(seedGroups);
  const [activeId, setActiveId] = useState<string>(fakeGroup.id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = load();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration on mount
      setGroups(saved.groups);
      if (saved.groups.some((g) => g.id === saved.activeId)) {
        setActiveId(saved.activeId);
      }
    }
    setReady(true);
  }, []);

  // Remote sync: owner-scoped rows win when reachable (logged-in + deployed).
  // A new user sees ONLY their own groups (empty at first) — never demo data.
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        const { data, errors } = await client.models.Group.list({
          filter: { owner: { eq: user.userId } },
        });
        if (!live) return;
        if (!errors?.length && data) {
          try {
            setGroups((data as Record<string, unknown>[]).map((r) => toGroup(r)));
          } catch {
            // contract drift -> keep local
          }
        }
      } catch {
        // logged out / offline -> keep local
      } finally {
        if (live) setSynced(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      // storage unavailable — demo still works in memory
    }
  }, [groups, activeId, ready]);

  const switchGroup = useCallback((id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const addGroup = useCallback((g: Group) => {
    setGroups((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
    setActiveId(g.id);
    if (isBackendEnabled()) {
      client.models.Group.create({
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
      }).catch(() => {});
    }
  }, []);

  const archiveGroup = useCallback((id: string, archived: boolean) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, archived } : g)));
    if (isBackendEnabled()) {
      client.models.Group.update({ id, archived }).catch(() => {});
    }
  }, []);

  const removeGroup = useCallback(
    (id: string) => {
      setGroups((prev) => {
        const next = prev.filter((g) => g.id !== id);
        if (next.length === 0) return prev;
        if (activeId === id) setActiveId(next[0].id);
        return next;
      });
      if (isBackendEnabled()) {
        client.models.Group.delete({ id }).catch(() => {});
      }
    },
    [activeId]
  );

  const backendOn = isBackendEnabled();
  const active = useMemo(() => {
    const found = groups.find((g) => g.id === activeId) ?? groups[0];
    if (found) return found;
    // Backend on + synced + empty = real new user: zeros, never demo fakes.
    if (backendOn && synced) return EMPTY_GROUP;
    return fakeGroup;
  }, [groups, activeId, backendOn, synced]);

  const value = useMemo(
    () => ({ groups, activeId, active, ready, synced, hasGroups: groups.length > 0, switchGroup, addGroup, archiveGroup, removeGroup }),
    [groups, activeId, active, ready, switchGroup, addGroup, archiveGroup, removeGroup]
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within GroupsProvider");
  return ctx;
}
