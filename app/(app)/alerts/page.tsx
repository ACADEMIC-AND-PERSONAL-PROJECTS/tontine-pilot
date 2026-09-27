"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fakeAlerts,
  audioDigestScript,
  alertMessageText,
  alertProposalText,
} from "@/lib/fake-data";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatFCFA, cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useGroups } from "@/lib/groups";
import { useRemoteCycleData } from "@/lib/use-remote";
import { client, isBackendEnabled } from "@/lib/backend";
import { toAlert } from "@/lib/remote";
import { installmentHalves, nextOpenCycleId } from "@/lib/catchup";
import {
  Bell,
  AlertTriangle,
  MessageCircle,
  Check,
  ArrowLeftRight,
  Landmark,
  Volume2,
  Square,
  Search,
  ChevronDown,
  ArrowDownWideNarrow,
} from "lucide-react";

const icons = {
  LATE_PAYMENT: AlertTriangle,
  ANOMALY: AlertTriangle,
  REMINDER: Bell,
  SWAP_PROPOSAL: ArrowLeftRight,
  EMERGENCY_DISPATCH: Landmark,
} as const;

type AlertType = (typeof fakeAlerts)[number]["type"];
type StatusFilter = "open" | "resolved" | "all";

const PAGE_SIZE = 4;

function toneFor(type: AlertType): "danger" | "warn" | "accent" | "ok" | "muted" {
  if (type === "ANOMALY") return "danger";
  if (type === "LATE_PAYMENT") return "warn";
  if (type === "EMERGENCY_DISPATCH") return "ok";
  if (type === "SWAP_PROPOSAL") return "accent";
  return "accent";
}

function labelFor(type: AlertType, fr: boolean) {
  const map = {
    ANOMALY: fr ? "Anomalie" : "Anomaly",
    LATE_PAYMENT: fr ? "Retard" : "Late",
    REMINDER: fr ? "Rappel" : "Reminder",
    SWAP_PROPOSAL: fr ? "Échange de tour" : "Swap proposal",
    EMERGENCY_DISPATCH: fr ? "Caisse de secours" : "Emergency fund",
  };
  return map[type];
}

const ALL_TYPES: AlertType[] = [
  "LATE_PAYMENT",
  "ANOMALY",
  "REMINDER",
  "SWAP_PROPOSAL",
  "EMERGENCY_DISPATCH",
];

export default function AlertsPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const backendOn = isBackendEnabled();
  const [alerts, setAlerts] = useState(backendOn ? [] : fakeAlerts);
  const [alertsLoaded, setAlertsLoaded] = useState(!backendOn);
  const { active, groups, synced } = useGroups();
  const noGroups = backendOn && synced && groups.length === 0;
  const remote = useRemoteCycleData(active.id);
  const cycleId = remote.cycle?.id;
  const cycleLabel = remote.cycle ? ` du cycle ${remote.cycle.cycleNumber}` : "";
  const cycleLabelEn = remote.cycle ? ` of cycle ${remote.cycle.cycleNumber}` : "";
  const [nudging, setNudging] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    if (!backendOn) return;
    let live = true;
    setAlertsLoaded(false);
    client.models.Alert.list({ filter: { groupId: { eq: active.id } } }).then(
      ({ data, errors }) => {
        if (!live) return;
        try {
          if (!errors?.length && data?.length) {
            setAlerts((data as Record<string, unknown>[]).map((r) => toAlert(r)));
          } else {
            setAlerts([]);
          }
        } catch {
          setAlerts([]);
        } finally {
          if (live) setAlertsLoaded(true);
        }
      },
      () => {
        if (live) {
          setAlerts([]);
          setAlertsLoaded(true);
        }
      }
    );
    return () => {
      live = false;
    };
  }, [active.id]);
  const [speaking, setSpeaking] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showResolved, setShowResolved] = useState(false);

  async function resolve(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
    if (isBackendEnabled()) {
      try {
        // Owner-proof: Lambda-created rows are not updatable by users directly.
        await client.mutations.resolveAlert({ alertId: id });
      } catch {
        // local state already updated
      }
    }
  }

  /** Accepting a proposal really applies it (not just resolving):
   *  - swap: exchange recipients between this cycle and the next OPEN one
   *  - installment: split the due into two PENDING halves (sums stay exact)
   *  - emergency: safety-net payout recorded as a DEBIT movement + the
   *    contribution marked covered (first FundMovement writes in the app) */
  async function acceptProposal(a: (typeof alerts)[number]) {
    const kind = a.proposal?.kind;
    if (!isBackendEnabled() || !kind) {
      await resolve(a.id);
      return;
    }
    setAccepting(a.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const amount = active.contributionAmount;
      const cycleId = a.cycleId ?? remote.cycle?.id;
      if (kind === "swap") {
        const cycles = await client.models.Cycle.list({
          filter: { groupId: { eq: active.id } },
        });
        const rows = ((cycles.data ?? []) as Array<{ id: string; cycleNumber: number; status?: string | null; recipientMemberId?: string | null; recipientName?: string | null }>);
        const open = rows
          .filter((c) => c.status === "OPEN")
          .sort((x, y) => x.cycleNumber - y.cycleNumber);
        const targetId = nextOpenCycleId(rows, a.cycleId);
        const cur = open.find((c) => c.id === a.cycleId) ?? open[0];
        const nxt = open.find((c) => c.id === targetId);
        if (cur && nxt && cur.id !== nxt.id) {
          await client.models.Cycle.update({
            id: cur.id,
            recipientMemberId: nxt.recipientMemberId ?? undefined,
            recipientName: nxt.recipientName ?? undefined,
          });
          await client.models.Cycle.update({
            id: nxt.id,
            recipientMemberId: cur.recipientMemberId ?? undefined,
            recipientName: cur.recipientName ?? undefined,
          });
        }
      } else if (cycleId && a.memberId) {
        const prior = await client.models.Contribution.list({
          filter: { cycleId: { eq: cycleId } },
        });
        const settled = (prior.data ?? []).find(
          (c) => c.memberId === a.memberId && (c.status === "CONFIRMED" || c.status === "COVERED_BY_EMERGENCY_FUND")
        );
        if (!settled) {
          if (kind === "installment") {
            const [first, second] = installmentHalves(amount);
            for (const [i, half] of [first, second].entries()) {
              await client.models.Contribution.create({
                groupId: active.id,
                cycleId,
                memberId: a.memberId as string,
                memberName: a.memberName ?? "",
                amount: half,
                status: "PENDING",
                dateDeclared: today,
                rawText: `Installment ${i + 1}/2 agreed (${a.id.slice(0, 8)})`,
                method: "MANUAL",
              });
            }
          } else {
            // Emergency cover comes OUT of the reserve: refuse when the
            // fund cannot cover, instead of writing fiction.
            const g = await client.models.Group.get({ id: active.id });
            const balance = g.data?.emergencyFundBalance ?? 0;
            if (balance < amount) {
              throw new Error(
                locale === "fr"
                  ? `Caisse insuffisante (${formatFCFA(balance, locale)}). Propose un étalement plutôt.`
                  : `Insufficient fund (${formatFCFA(balance, locale)}). Propose installments instead.`
              );
            }
            await client.models.FundMovement.create({
              groupId: active.id,
              cycleId,
              kind: "DEBIT",
              amount,
              reason: `Safety-net payout for ${a.memberName ?? a.memberId} (${a.id.slice(0, 8)})`,
              reasonEn: `Safety-net payout for ${a.memberName ?? a.memberId} (${a.id.slice(0, 8)})`,
              createdAt: new Date().toISOString(),
            });
            await client.models.Contribution.create({
              groupId: active.id,
              cycleId,
              memberId: a.memberId as string,
              memberName: a.memberName ?? "",
              amount,
              status: "COVERED_BY_EMERGENCY_FUND",
              dateDeclared: today,
              rawText: `Covered by emergency fund (${a.id.slice(0, 8)})`,
              method: "EMERGENCY_FUND",
            });
            await client.models.Group.update({
              id: active.id,
              emergencyFundBalance: Math.max(0, balance - amount),
            }).catch(() => null);
          }
        }
      }
      await resolve(a.id);
    } catch (e) {
      setAcceptError({ id: a.id, msg: (e as Error)?.message ?? "apply-failed" });
    } finally {
      setAccepting(null);
    }
  }

  async function nudge(id: string) {
    if (!isBackendEnabled() || nudging) return;
    setNudging(id);
    try {
      await client.mutations.sendNudge({ alertId: id });
    } catch {
      // mock-send or offline: brief spin only
    } finally {
      setNudging(null);
    }
  }

  function resetPaging() {
    setVisible(PAGE_SIZE);
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);

  function speakLocal() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      fr ? audioDigestScript.fr : audioDigestScript.en
    );
    u.lang = fr ? "fr-FR" : "en-US";
    u.rate = 1.02;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  async function playDigest() {
    // Real Polly audio first, local synthesis as fallback.
    if (isBackendEnabled()) {
      setSpeaking(true);
      try {
        if (!cycleId) throw new Error("no-cycle");
        const res = await client.queries.buildDigest({ cycleId, locale });
        if (!res.errors?.length && res.data?.audioUrl) {
          const audio = new Audio(res.data.audioUrl);
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => {
            setSpeaking(false);
            speakLocal();
          };
          await audio.play();
          return;
        }
      } catch {
        // fall through to local synthesis
      }
      setSpeaking(false);
    }
    speakLocal();
  }

  function stopDigest() {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: alerts.length };
    for (const t of ALL_TYPES) c[t] = alerts.filter((a) => a.type === t).length;
    c.open = alerts.filter((a) => !a.resolved).length;
    c.resolved = alerts.filter((a) => a.resolved).length;
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = alerts.filter((a) => {
      if (status === "open" && a.resolved) return false;
      if (status === "resolved" && !a.resolved) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      const hay = `${a.memberName} ${alertMessageText(a, locale)} ${labelFor(a.type, fr)}`.toLowerCase();
      return hay.includes(q);
    });
    list = [...list].sort((a, b) =>
      newestFirst
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    );
    return list;
  }, [alerts, status, typeFilter, query, newestFirst, locale, fr]);

  const openList = filtered.filter((a) => !a.resolved);
  const doneList = filtered.filter((a) => a.resolved);
  // In "open" mode show openList paginated; in "resolved" show doneList; in "all" show open paginated + resolved collapsible
  const mainList = status === "resolved" ? doneList : openList;
  const shown = mainList.slice(0, visible);
  const hasMore = visible < mainList.length;

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {fr ? 'Médiateur IA · EventBridge' : 'AI mediator · EventBridge'}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {fr ? "Rappels & médiation" : "Alerts & mediation"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {fr
            ? "Relances empathiques, échanges de tour, caisse de secours — générés pour le groupe."
            : "Empathic nudges, tour swaps, emergency cover — generated for the group."}
        </p>
      </motion.div>

      {/* Audio digest */}
      {noGroups && (
        <div className="panel mt-6 rounded-2xl px-5 py-8 text-center">
          <p className="text-sm font-medium">{fr ? "Aucun groupe pour l'instant" : "No groups yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            {fr ? "Crée ton premier groupe pour recevoir alertes et digest." : "Create your first group to get alerts and digest."}
          </p>
        </div>
      )}
      {!noGroups && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="panel-luminous mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {fr ? 'Audio-digest · Polly' : 'Audio digest · Polly'}
          </p>
          <p className="mt-1 text-sm font-medium">
            {fr
              ? `Écouter le bilan${cycleLabel}`
              : `Listen to the summary${cycleLabelEn}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {fr
              ? `Caisse de secours : ${formatFCFA(active.emergencyFundBalance, locale)}`
              : `Emergency fund: ${formatFCFA(active.emergencyFundBalance, locale)}`}
          </p>
        </div>
        {speaking ? (
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={stopDigest}>
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        ) : (
          <Button size="sm" data-testid="dw-digest-play" className="gap-1.5" onClick={playDigest}>
            <Volume2 className="h-3.5 w-3.5" />
            {fr ? "Lire à voix haute" : "Play digest"}
          </Button>
        )}
      </motion.div>
      )}

      {/* Toolbar: search + status + type filters — avoids endless scroll */}
      <div className="panel mt-6 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-dim" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPaging();
              }}
              placeholder={fr ? "Rechercher un membre, un mot…" : "Search a member, a word…"}
              className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
            />
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background/40 p-1">
            {(["open", "resolved", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  resetPaging();
                }}
                className={cn(
                  "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors",
                  status === s
                    ? "bg-accent-glow text-accent-hover"
                    : "text-muted hover:text-foreground"
                )}
              >
                {s === "open"
                  ? `${fr ? "Ouvertes" : "Open"} (${counts.open ?? 0})`
                  : s === "resolved"
                    ? `${fr ? "Résolues" : "Resolved"} (${counts.resolved ?? 0})`
                    : `${fr ? "Tout" : "All"} (${counts.all ?? 0})`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            className="flex items-center gap-1.5 self-start rounded-xl border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-accent/30 hover:text-foreground sm:self-auto"
            title={fr ? "Ordre de tri" : "Sort order"}
          >
            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
            {newestFirst ? (fr ? "Récentes" : "Newest") : fr ? "Anciennes" : "Oldest"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              resetPaging();
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              typeFilter === "all"
                ? "border-accent/40 bg-accent-glow text-accent-hover"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            {fr ? "Tous types" : "All types"} · {counts.all}
          </button>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTypeFilter(typeFilter === t ? "all" : t);
                resetPaging();
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                typeFilter === t
                  ? "border-accent/40 bg-accent-glow text-accent-hover"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {labelFor(t, fr)} · {counts[t] ?? 0}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-dim">
          {fr
            ? `Affichage ${shown.length} sur ${mainList.length} alerte${mainList.length > 1 ? "s" : ""}`
            : `Showing ${shown.length} of ${mainList.length} alert${mainList.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <div data-testid="dw-alerts" className="mt-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {shown.map((a, i) => {
            const Icon = icons[a.type];
            const resolved = a.resolved;
            return (
              <motion.article
                key={a.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, height: 0 }}
                transition={{ delay: Math.min(i, 3) * 0.04, duration: 0.4 }}
                className={cn(
                  "shadow-elevate-medium overflow-hidden rounded-2xl border border-border bg-bg-raised",
                  resolved && "opacity-70"
                )}
              >
                <div className="flex items-start gap-4 p-5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      a.type === "ANOMALY"
                        ? "bg-danger/15 text-danger"
                        : a.type === "LATE_PAYMENT"
                          ? "bg-warn/15 text-warn"
                          : a.type === "EMERGENCY_DISPATCH"
                            ? "bg-ok/15 text-ok"
                            : "bg-accent-glow text-accent-hover"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={a.memberName} size="sm" />
                      <span className="text-sm font-medium">{a.memberName}</span>
                      <Badge tone={toneFor(a.type)}>
                        {labelFor(a.type, fr)}
                      </Badge>
                      <span className="text-xs text-muted">
                        {formatDate(a.createdAt, locale)}
                      </span>
                      {resolved && (
                        <Badge tone="muted">{fr ? "Résolue" : "Resolved"}</Badge>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                      {alertMessageText(a, locale)}
                    </p>
                    {a.proposal && (
                      <div className="mt-3 rounded-xl border border-accent/20 bg-accent-glow/40 px-3.5 py-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-accent-hover">
                          {fr ? "Proposition IA" : "AI proposal"}
                        </p>
                        <p className="mt-1 text-sm text-foreground/90">
                          {alertProposalText(a, locale)}
                        </p>
                      </div>
                    )}
                    {!resolved && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {a.proposal && (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={accepting === a.id}
                            onClick={() => {
                              setAcceptError(null);
                              acceptProposal(a);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {accepting === a.id
                              ? fr
                                ? "Application…"
                                : "Applying…"
                              : fr
                                ? "Accepter"
                                : "Accept"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          onClick={() => resolve(a.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {fr ? "Marquer résolu" : "Mark resolved"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => nudge(a.id)}
                          disabled={nudging === a.id}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {nudging === a.id
                            ? fr
                              ? "Envoi…"
                              : "Sending…"
                            : fr
                              ? "Relancer"
                              : "Nudge"}
                        </Button>
                      </div>
                    )}
                    {acceptError?.id === a.id && (
                      <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm">
                        {acceptError.msg}
                      </p>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {!alertsLoaded && (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {alertsLoaded && filtered.length === 0 && (
          <p className="rounded-2xl border border-border px-5 py-8 text-center text-sm text-muted">
            {fr
              ? "Aucune alerte ne correspond à ces filtres."
              : "No alerts match these filters."}
          </p>
        )}

        {openList.length === 0 && doneList.length === 0 && filtered.length !== 0 && (
          <p className="rounded-2xl border border-ok/25 bg-ok/10 px-5 py-8 text-center text-sm text-ok">
            {fr
              ? "Toutes les alertes sont traitées. Beau travail."
              : "All alerts cleared. Nice work."}
          </p>
        )}

        {hasMore ? (
          <Button
            variant="secondary"
            className="w-full gap-1.5"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            <ChevronDown className="h-4 w-4" />
            {fr
              ? `Afficher plus (${mainList.length - visible} restantes)`
              : `Show more (${mainList.length - visible} left)`}
          </Button>
        ) : (
          mainList.length > PAGE_SIZE && (
            <button
              type="button"
              onClick={() => setVisible(PAGE_SIZE)}
              className="mx-auto block text-xs text-muted-dim hover:text-foreground hover:underline"
            >
              {fr ? "Réduire la liste" : "Collapse list"}
            </button>
          )
        )}

        {status === "all" && doneList.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted hover:text-foreground"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", showResolved && "rotate-180")}
              />
              {fr ? "Résolues" : "Resolved"} ({doneList.length})
            </button>
            {showResolved &&
              doneList.map((a) => (
                <div
                  key={a.id}
                  className="mb-2 rounded-xl border border-border px-4 py-3 text-sm text-muted line-through opacity-60"
                >
                  {a.memberName} — {labelFor(a.type, fr)}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
