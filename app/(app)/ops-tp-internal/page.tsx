"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, Landmark, LayoutGrid, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n";
import { client, isBackendEnabled } from "@/lib/backend";
import { sessionUserId } from "@/lib/session";
import { fetchAuthSession } from "aws-amplify/auth";
import { formatMoney } from "@/lib/utils";

/** How many rows to scan per table (support console, not analytics). */
const SCAN_LIMIT = 200;

type MemberRow = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  email: string;
  trustScore: number;
  lateCount: number;
};

type AlertRow = {
  id: string;
  groupName: string;
  memberName: string;
  type: string;
  createdAt: string;
  message: string;
};

type FeedItem = {
  id: string;
  when: string;
  text: string;
  tone: "ok" | "warn" | "danger" | "accent" | "muted";
};

/** Internal ops console — deliberately NOT linked anywhere (no sidebar, no
 *  landing, no assistant index). Obscure URL + allowlist gate below; anyone
 *  else gets a 404 so the page does not reveal itself.
 *  Admins: NEXT_PUBLIC_TP_ADMINS="admin@domain,ops@domain". */
const ADMIN_ENTRY = (process.env.NEXT_PUBLIC_TP_ADMINS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export default function OpsConsolePage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [gate, setGate] = useState<"checking" | "ok" | "deny">("checking");
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState({ groups: 0, members: 0, cycles: 0, contributions: 0, alerts: 0, movements: 0 });
  const [collected, setCollected] = useState(0);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [q, setQ] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!isBackendEnabled()) {
        if (live) setGate("deny");
        return;
      }
      try {
        const session = await fetchAuthSession();
        const email = String(session.tokens?.idToken?.payload?.email ?? "").toLowerCase();
        await sessionUserId();
        if (!live) return;
        if (!email || !ADMIN_ENTRY.includes(email)) {
          setGate("deny");
          return;
        }
        setGate("ok");
        const [g, m, c, co, a, mv] = await Promise.all([
          client.models.Group.list({ limit: SCAN_LIMIT }),
          client.models.Member.list({ limit: SCAN_LIMIT }),
          client.models.Cycle.list({ limit: SCAN_LIMIT }),
          client.models.Contribution.list({ limit: SCAN_LIMIT }),
          client.models.Alert.list({ limit: SCAN_LIMIT }),
          client.models.FundMovement.list({ limit: SCAN_LIMIT }),
        ]);
        if (!live) return;
        const groups = (g.data ?? []) as Array<Record<string, unknown>>;
        const groupName = new Map(groups.map((x) => [String(x.id), String(x.name ?? "?")]));
        const mems = ((m.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id),
          groupId: String(r.groupId ?? ""),
          groupName: groupName.get(String(r.groupId ?? "")) ?? "?",
          name: String(r.name ?? "?"),
          email: String(r.email ?? ""),
          trustScore: Number(r.trustScore ?? 0),
          lateCount: Number(r.lateCount ?? 0),
        }));
        const openAlerts = ((a.data ?? []) as Array<Record<string, unknown>>)
          .filter((r) => !r.resolved)
          .map((r) => ({
            id: String(r.id),
            groupName: groupName.get(String(r.groupId ?? "")) ?? "?",
            memberName: String(r.memberName ?? "?"),
            type: String(r.type ?? ""),
            createdAt: String(r.createdAt ?? ""),
            message: String(r.message ?? ""),
          }))
          .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
        const contribs = ((co.data ?? []) as Array<Record<string, unknown>>)
          .filter((r) => r.status === "CONFIRMED")
          .sort((x, y) => String(x.dateDeclared ?? "") < String(y.dateDeclared ?? "") ? 1 : -1);
        setCounts({
          groups: groups.length,
          members: mems.length,
          cycles: (c.data ?? []).length,
          contributions: (co.data ?? []).length,
          alerts: openAlerts.length,
          movements: (mv.data ?? []).length,
        });
        setCollected(contribs.reduce((n, r) => n + Number(r.amount ?? 0), 0));
        setMembers(mems.sort((x, y) => x.trustScore - y.trustScore));
        setAlerts(openAlerts.slice(0, 30));
        setFeed([
          ...contribs.slice(0, 8).map((r) => ({
            id: `c-${String(r.id)}`,
            when: String(r.dateDeclared ?? ""),
            text: `${String(r.memberName ?? "?")} — ${Number(r.amount ?? 0).toLocaleString("fr-FR")} · ${groupName.get(String(r.groupId ?? "")) ?? "?"}`,
            tone: "ok" as const,
          })),
          ...openAlerts.slice(0, 6).map((r) => ({
            id: `a-${r.id}`,
            when: String(r.createdAt ?? "").slice(0, 10),
            text: `${r.type} — ${r.memberName} · ${r.groupName}`,
            tone: "warn" as const,
          })),
        ]);
        setLoaded(true);
      } catch {
        if (live) setGate("deny");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members.slice(0, 50);
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(needle) ||
          m.email.toLowerCase().includes(needle) ||
          m.groupName.toLowerCase().includes(needle)
      )
      .slice(0, 50);
  }, [members, q]);

  async function resolveAlert(id: string) {
    setResolving(id);
    try {
      await client.mutations.resolveAlert({ alertId: id });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setResolving(null);
    }
  }

  if (gate === "deny") notFound();
  if (gate === "checking" || !loaded) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      </div>
    );
  }

  const cards = [
    { icon: LayoutGrid, label: fr ? "Groupes" : "Groups", value: counts.groups },
    { icon: Users, label: fr ? "Membres" : "Members", value: counts.members },
    { icon: Activity, label: fr ? "Cycles" : "Cycles", value: counts.cycles },
    { icon: Wallet, label: fr ? "Cotisations" : "Contributions", value: counts.contributions },
    { icon: AlertTriangle, label: fr ? "Alertes ouvertes" : "Open alerts", value: counts.alerts },
    { icon: Landmark, label: fr ? "Mouvements caisse" : "Fund movements", value: counts.movements },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {fr ? "Interne · console ops" : "Internal · ops console"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {fr ? "Pilotage plateforme" : "Platform overview"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {fr
            ? `${formatMoney(collected, "FCFA", locale)} collectés au total · ${counts.groups} groupes suivis.`
            : `${formatMoney(collected, "FCFA", locale)} collected in total · ${counts.groups} groups tracked.`}
        </p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="panel-luminous rounded-2xl p-4">
            <c.icon className="h-4 w-4 text-accent-hover" />
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold">{fr ? "Activité récente" : "Recent activity"}</h2>
          <div className="mt-3 space-y-2.5">
            {feed.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <Badge tone={f.tone}>{f.when || "—"}</Badge> <span className="text-muted">{f.text}</span>
                </span>
              </div>
            ))}
            {feed.length === 0 && (
              <p className="text-sm text-muted">{fr ? "Rien pour l'instant." : "Nothing yet."}</p>
            )}
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold">{fr ? "Alertes ouvertes (support)" : "Open alerts (support)"}</h2>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{a.memberName}</span>{" "}
                  <span className="text-muted">· {a.type} · {a.groupName}</span>
                </span>
                <Button size="sm" variant="ghost" disabled={resolving === a.id} onClick={() => resolveAlert(a.id)}>
                  {fr ? "Résoudre" : "Resolve"}
                </Button>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-sm text-muted">{fr ? "Aucune alerte ouverte." : "No open alerts."}</p>
            )}
          </div>
        </div>
      </div>

      <div className="panel mt-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{fr ? "Utilisateurs / membres" : "Users / members"}</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={fr ? "Rechercher nom, email, groupe…" : "Search name, email, group…"}
            className="w-full max-w-xs rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-3">{fr ? "Membre" : "Member"}</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">{fr ? "Groupe" : "Group"}</th>
                <th className="py-2 pr-3">Trust</th>
                <th className="py-2">{fr ? "Retards" : "Lates"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3 font-medium">{m.name}</td>
                  <td className="py-2 pr-3 text-muted">{m.email}</td>
                  <td className="py-2 pr-3 text-muted">{m.groupName}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    <Badge tone={m.trustScore >= 90 ? "ok" : m.trustScore >= 70 ? "accent" : "warn"}>
                      {m.trustScore}
                    </Badge>
                  </td>
                  <td className="py-2 tabular-nums">{m.lateCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
