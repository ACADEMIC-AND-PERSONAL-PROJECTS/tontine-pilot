"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  currentCycle,
  fakeAlerts,
  fakeContributions,
  pastCycles,
  stats,
  audioDigestScript,
  contributionText,
  alertMessageText,
} from "@/lib/fake-data";
import { formatDate, formatFCFA } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { useGroups } from "@/lib/groups";
import { client, isBackendEnabled } from "@/lib/backend";
import { useRemoteCycleData, useRemoteGroup } from "@/lib/use-remote";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Landmark,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const fr = locale === "fr";
  const { active: localActive, groups, synced } = useGroups();
  const backendOn = isBackendEnabled();
  const remoteGroup = useRemoteGroup(localActive.id);
  const active = remoteGroup.group ?? localActive;
  const remote = useRemoteCycleData(localActive.id);
  // Backend on: trust remote rows even when empty (real zeros, never fakes).
  // Backend off / unreachable: demo dataset.
  const useRemote = backendOn && (remote.loaded || remoteGroup.loaded);
  const contributions = useRemote ? remote.contributions : fakeContributions;
  const allAlerts = useRemote ? remote.alerts : fakeAlerts;
  const remoteCycles = useRemote ? remote.cycles : [];
  const pastList = useRemote
    ? remoteCycles.filter((c) => remote.cycle == null || c.id !== remote.cycle.id)
    : pastCycles;
  const cycle = remote.cycle ?? {
    cycleNumber: currentCycle.cycleNumber,
    recipientName: currentCycle.recipientName,
    startDate: currentCycle.startDate,
    endDate: currentCycle.endDate,
  };
  const collected = active.cycleCollected ?? currentCycle.totalCollected;
  const expected = active.cycleExpected ?? currentCycle.totalExpected;
  const pct = Math.round((collected / expected) * 100);
  const unpaid = contributions.filter((c) => c.status !== "CONFIRMED");
  const openAlerts = allAlerts.filter((a) => !a.resolved);
  const fundPct = Math.round(
    (active.emergencyFundBalance / active.emergencyFundTarget) * 100
  );
  const [speaking, setSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  function speakLocal() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      locale === "fr" ? audioDigestScript.fr : audioDigestScript.en
    );
    u.lang = locale === "fr" ? "fr-FR" : "en-US";
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
        const cycleId = remote.cycle?.id ?? currentCycle.id;
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {backendOn && !synced && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}
      {backendOn && synced && groups.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-luminous flex flex-col items-center rounded-2xl px-6 py-16 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {fr ? "Bienvenue" : "Welcome"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {fr ? "Crée ton premier groupe" : "Create your first group"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            {fr
              ? "Tes chiffres partiront de zéro — aucun argent suivi pour l'instant. Nomme ton groupe, invite tes membres, lance le premier cycle."
              : "Your numbers start at zero — nothing tracked yet. Name your group, invite members, start the first cycle."}
          </p>
          <Link href="/group/new" className="mt-6">
            <Button className="gap-1.5">
              {fr ? "Créer un groupe" : "Create a group"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
      {(!backendOn || !synced || groups.length > 0) && (
        <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs text-muted">{active.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("dash.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Cycle {cycle.cycleNumber} · {cycle.recipientName} ·{" "}
            {formatDate(cycle.startDate, locale)} → {formatDate(cycle.endDate, locale)}
          </p>
          {(active.startDate || active.endDate) && (
            <p className="mt-1 text-xs text-muted-dim">
              {fr ? "Tontine" : "Tontine"} · {active.startDate || "…"} → {active.endDate || "…"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/declare">
            <Button size="sm">{t("dash.declare")}</Button>
          </Link>
          <Link href="/export">
            <Button variant="secondary" size="sm">
              {t("dash.export")}
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("dash.collected"),
            value: collected,
            format: "money" as const,
            hint: `/ ${formatFCFA(expected, locale)}`,
          },
          {
            label: t("dash.completion"),
            value: pct,
            format: "pct" as const,
            hint: "",
          },
          {
            label: t("dash.members"),
            value: active.memberCount,
            format: "num" as const,
            hint: `${formatFCFA(active.contributionAmount, locale)} / ${fr ? "mois" : "month"}`,
          },
          {
            label: t("dash.alerts"),
            value: active.openAlerts ?? stats.activeAlerts,
            format: "num" as const,
            hint: "",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
            className="panel-luminous p-5"
          >
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
              {s.format === "money" ? (
                <AnimatedNumber value={s.value} suffix=" FCFA" />
              ) : s.format === "pct" ? (
                <AnimatedNumber value={s.value} suffix="%" />
              ) : (
                <AnimatedNumber value={s.value} />
              )}
            </p>
            {s.hint ? <p className="mt-1 text-xs text-muted">{s.hint}</p> : null}
          </motion.div>
        ))}
      </div>

      {/* Emergency fund + audio digest */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="panel-luminous p-5"
        >
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-accent-hover" />
            <h2 className="text-base font-semibold tracking-tight">
              {t("dash.fund")}
            </h2>
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
            <AnimatedNumber
              value={active.emergencyFundBalance}
              suffix=" FCFA"
            />
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("dash.fundHint")} · {fr ? "cible" : "target"}{" "}
            {formatFCFA(active.emergencyFundTarget, locale)}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${fundPct}%` }}
              transition={{ duration: 0.9, delay: 0.2 }}
            />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="panel-luminous flex flex-col justify-between p-5"
        >
          <div>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-accent-hover" />
              <h2 className="text-base font-semibold tracking-tight">
                {t("dash.audio")}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted">{t("dash.audioHint")}</p>
          </div>
          <Button
            size="sm"
            className="mt-4 w-fit gap-1.5"
            onClick={playDigest}
            disabled={speaking}
          >
            <Volume2 className="h-3.5 w-3.5" />
            {speaking ? t("dash.audioPlaying") : t("dash.audioPlay")}
          </Button>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="panel lg:col-span-3"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {t("dash.contributions")}
              </h2>
              <p className="text-xs text-muted">Cycle {cycle.cycleNumber}</p>
            </div>
            <Badge tone="accent">{pct}%</Badge>
          </div>

          <div className="relative mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>

          <div className="mt-2 max-h-[420px] divide-y divide-border overflow-y-auto scrollbar-thin">
            {contributions.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted">
                {fr
                  ? "Aucune cotisation pour ce cycle — déclare la première."
                  : "No contributions this cycle — declare the first one."}
              </p>
            )}
            {contributions.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.025 }}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={c.memberName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.memberName}</p>
                    <p className="truncate text-xs text-muted">
                      {contributionText(c, locale) || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.status === "CONFIRMED" && (
                    <span className="hidden font-mono text-xs tabular-nums text-muted sm:inline">
                      {formatFCFA(c.amount, locale)}
                    </span>
                  )}
                  <Badge
                    tone={
                      c.status === "CONFIRMED"
                        ? "ok"
                        : c.status === "LATE"
                          ? "danger"
                          : c.status === "COVERED_BY_EMERGENCY_FUND"
                            ? "accent"
                            : "warn"
                    }
                  >
                    {c.status === "CONFIRMED" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : c.status === "LATE" ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {c.status === "CONFIRMED"
                      ? "OK"
                      : c.status === "LATE"
                        ? fr ? "En retard" : "Late"
                        : c.status === "COVERED_BY_EMERGENCY_FUND"
                          ? fr ? "Secours" : "Fund"
                          : fr ? "En attente" : "Pending"}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
            className="panel p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">
                {t("dash.outstanding")}
              </h2>
              <Badge tone="warn">{unpaid.length}</Badge>
            </div>
            <ul className="mt-4 space-y-3">
              {unpaid.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={c.memberName} size="sm" />
                    <span className="text-sm">{c.memberName}</span>
                  </div>
                  <Badge tone={c.status === "LATE" ? "danger" : "warn"}>
                    {c.status === "LATE" ? (fr ? "En retard" : "Late") : fr ? "En attente" : "Pending"}
                  </Badge>
                </li>
              ))}
            </ul>
            <Link href="/declare" className="mt-4 block">
              <Button variant="secondary" size="sm" className="w-full gap-1.5">
                {t("dash.forThem")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.45 }}
            className="panel p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">
                {t("dash.aiAlerts")}
              </h2>
              <Link
                href="/alerts"
                className="text-xs font-medium text-accent-hover hover:underline"
              >
                {t("dash.viewAll")}
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {openAlerts.slice(0, 2).map((a) => (
                <li
                  key={a.id}
                  className="rounded-[10px] border border-border bg-bg-subtle/60 p-3"
                >
                  <Badge
                    tone={
                      a.type === "ANOMALY"
                        ? "danger"
                        : a.type === "LATE_PAYMENT"
                          ? "warn"
                          : a.type === "EMERGENCY_DISPATCH"
                            ? "ok"
                            : "accent"
                    }
                    className="mb-2"
                  >
                    {a.type === "ANOMALY"
                      ? fr ? "Anomalie" : "Anomaly"
                      : a.type === "LATE_PAYMENT"
                        ? fr ? "Retard" : "Late"
                        : a.type === "SWAP_PROPOSAL"
                          ? fr ? "Échange" : "Swap"
                          : a.type === "EMERGENCY_DISPATCH"
                            ? fr ? "Secours" : "Fund"
                            : fr ? "Rappel" : "Reminder"}
                  </Badge>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted">
                    {alertMessageText(a, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.45 }}
        className="panel p-5"
      >
        <h2 className="text-base font-semibold tracking-tight">{t("dash.past")}</h2>
        {pastList.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {fr ? "Aucun cycle clôturé pour l'instant." : "No closed cycles yet."}
          </p>
        ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {pastList.map((c) => (
            <div
              key={c.id}
              className="rounded-[10px] border border-border bg-bg-subtle/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cycle {c.cycleNumber}</span>
                <Badge tone="muted">{fr ? "Clôturé" : "Closed"}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted">→ {c.recipientName}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                {formatFCFA("totalCollected" in c ? (c.totalCollected as number) : 0, locale)}
              </p>
            </div>
          ))}
        </div>
        )}
      </motion.div>
        </>
      )}
    </div>
  );
}
