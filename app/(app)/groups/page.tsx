"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGroups } from "@/lib/groups";
import { groupDescriptionText } from "@/lib/fake-data";
import { formatFCFA, formatMoney, cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import {
  Plus,
  Search,
  Users,
  ArrowRight,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
  ChevronDown,
} from "lucide-react";

export default function GroupsPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const router = useRouter();
  const { groups, activeId, switchGroup, archiveGroup, removeGroup } = useGroups();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const live = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return live;
    return live.filter((g) =>
      `${g.name} ${groupDescriptionText(g, locale)}`.toLowerCase().includes(q)
    );
  }, [live, query, locale]);

  function open(id: string) {
    switchGroup(id);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {fr ? "Mes tontines" : "My tontines"} · {live.length}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {fr ? "Gérer mes groupes" : "Manage my groups"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {fr
              ? "Bascule d'un groupe à l'autre, archive ceux en pause, crée-en de nouveaux."
              : "Switch between groups, archive paused ones, create new ones."}
          </p>
        </div>
        <Link href="/group/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            {fr ? "Nouveau groupe" : "New group"}
          </Button>
        </Link>
      </motion.div>

      <div className="panel mt-6 rounded-2xl p-4 sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fr ? "Rechercher un groupe…" : "Search a group…"}
            className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
          />
        </label>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 rounded-2xl border border-border px-5 py-8 text-center text-sm text-muted">
          {fr ? "Aucun groupe ne correspond à cette recherche." : "No group matches this search."}
        </p>
      )}

      <div data-testid="dw-groups" className="mt-6 grid gap-4 md:grid-cols-2">
        {filtered.map((g, i) => {
          const isActive = g.id === activeId;
          const collected = g.cycleCollected ?? 0;
          const expected = g.cycleExpected ?? 1;
          const pct = Math.min(100, Math.round((collected / expected) * 100));
          return (
            <motion.article
              key={g.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 4) * 0.05, duration: 0.4 }}
              className={cn(
                "panel-luminous flex flex-col rounded-2xl p-5",
                isActive && "border-accent/40"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-base font-semibold tracking-tight">{g.name}</h2>
                {isActive && (
                  <Badge tone="ok" className="gap-1">
                    <Check className="h-3 w-3" />
                    {fr ? "Actif" : "Active"}
                  </Badge>
                )}
                {g.role && <Badge tone="muted">{g.role}</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {groupDescriptionText(g, locale)}
              </p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {g.memberCount} {fr ? "membres" : "members"}
                </span>
                <span>
                  {formatMoney(g.contributionAmount, g.currency, locale)} /{" "}
                  {g.frequency === "MONTHLY" ? (fr ? "mois" : "month") : fr ? "semaine" : "week"}
                </span>
                {(g.openAlerts ?? 0) > 0 && (
                  <span className="text-warn">
                    {g.openAlerts} {fr ? "alertes" : "alerts"}
                  </span>
                )}
                {(g.startDate || g.endDate) && (
                  <span>
                    {g.startDate || "…"} → {g.endDate || "…"}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-muted">
                  <span>
                    {fr ? "Cycle" : "Cycle"} {g.currentCycleIndex}
                  </span>
                  <span className="font-mono tabular-nums">{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-gold transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-dim">
                  {formatMoney(collected, g.currency, locale)} / {formatMoney(expected, g.currency, locale)}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {!isActive ? (
                  <Button size="sm" className="gap-1.5" onClick={() => open(g.id)}>
                    {fr ? "Ouvrir" : "Open"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Link href="/dashboard">
                    <Button size="sm" variant="secondary" className="gap-1.5">
                      {fr ? "Voir le dashboard" : "View dashboard"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => archiveGroup(g.id, true)}
                  title={fr ? "Archiver" : "Archive"}
                >
                  <Archive className="h-3.5 w-3.5" />
                  {fr ? "Archiver" : "Archive"}
                </Button>
                {confirmDelete === g.id ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-danger">{fr ? "Supprimer ?" : "Delete?"}</span>
                    <button
                      type="button"
                      className="font-medium text-danger hover:underline"
                      onClick={() => {
                        removeGroup(g.id);
                        setConfirmDelete(null);
                      }}
                    >
                      {fr ? "Oui" : "Yes"}
                    </button>
                    <button
                      type="button"
                      className="text-muted hover:text-foreground"
                      onClick={() => setConfirmDelete(null)}
                    >
                      {fr ? "Non" : "No"}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(g.id)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>

      {archived.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showArchived && "rotate-180")}
            />
            {fr ? "Archivés" : "Archived"} ({archived.length})
          </button>
          {showArchived && (
            <div className="mt-3 space-y-2">
              {archived.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm opacity-70"
                >
                  <span>
                    <span className="font-medium">{g.name}</span>{" "}
                    <span className="text-xs text-muted">
                      · {g.memberCount} {fr ? "membres" : "members"}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => archiveGroup(g.id, false)}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    {fr ? "Restaurer" : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
