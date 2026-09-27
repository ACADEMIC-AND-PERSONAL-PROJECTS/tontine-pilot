"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Landmark, Plus, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n";
import { useGroups } from "@/lib/groups";
import { client, isBackendEnabled } from "@/lib/backend";
import { formatMoney } from "@/lib/utils";

type Movement = {
  id: string;
  kind: string;
  amount: number;
  reason?: string | null;
  createdAt: string;
};

type Covered = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  cycleId: string;
};

/** Emergency fund (Tontine Flex): the collective safety reserve.
 *  Fund it with top-ups, cover critical lates from it, track repayments —
 *  the full loop: IN (top-up/repay) → OUT (safety-net payout). */
export default function FundPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const { groups, active, synced } = useGroups();
  const backendOn = isBackendEnabled();
  const noGroups = backendOn && synced && groups.length === 0;

  const [selectedId, setSelectedId] = useState<string>("");
  const group = useMemo(
    () => groups.find((g) => g.id === (selectedId || active.id)) ?? active,
    [groups, selectedId, active]
  );
  const [movements, setMovements] = useState<Movement[]>([]);
  const [covered, setCovered] = useState<Covered[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Fresh group row (balance/target): the context cache does not refresh
  // on our writes, so re-read the row on every load.
  const [fresh, setFresh] = useState<{ emergencyFundBalance?: number | null; emergencyFundTarget?: number | null } | null>(null);
  const [topUp, setTopUp] = useState("");
  const [target, setTarget] = useState("");
  const [repayFor, setRepayFor] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!backendOn || !group.id) return;
    setLoaded(false);
    try {
      const [mv, co, gr] = await Promise.all([
        client.models.FundMovement.list({ filter: { groupId: { eq: group.id } } }),
        client.models.Contribution.list({ filter: { groupId: { eq: group.id } } }),
        client.models.Group.get({ id: group.id }),
      ]);
      setMovements(
        ((mv.data ?? []) as Array<Record<string, unknown>>)
          .map((r) => ({
            id: String(r.id),
            kind: String(r.kind ?? ""),
            amount: Number(r.amount ?? 0),
            reason: (r.reason as string) ?? null,
            createdAt: String(r.createdAt ?? ""),
          }))
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      );
      setCovered(
        ((co.data ?? []) as Array<Record<string, unknown>>)
          .filter((r) => r.status === "COVERED_BY_EMERGENCY_FUND")
          .map((r) => ({
            id: String(r.id),
            memberId: String(r.memberId ?? ""),
            memberName: String(r.memberName ?? ""),
            amount: Number(r.amount ?? 0),
            cycleId: String(r.cycleId ?? ""),
          }))
      );
      const grow = (gr.data ?? {}) as { emergencyFundBalance?: number | null; emergencyFundTarget?: number | null };
      setFresh({ emergencyFundBalance: grow.emergencyFundBalance, emergencyFundTarget: grow.emergencyFundTarget });
    } finally {
      setLoaded(true);
    }
  }, [backendOn, group.id, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote load on group change
    load();
  }, [load]);

  const balance = fresh?.emergencyFundBalance ?? group.emergencyFundBalance ?? 0;
  const fundTarget = fresh?.emergencyFundTarget ?? group.emergencyFundTarget ?? 0;
  const coverage = fundTarget > 0 ? Math.min(100, Math.round((balance / fundTarget) * 100)) : 0;
  const repaidTotal = movements
    .filter((m) => m.kind === "REPAY")
    .reduce((n, m) => n + m.amount, 0);
  const paidOutTotal = movements
    .filter((m) => m.kind === "DEBIT")
    .reduce((n, m) => n + m.amount, 0);
  const coveredTotal = covered.reduce((n, c) => n + c.amount, 0);

  async function refreshGroup() {
    setTick((t) => t + 1);
  }

  async function doTopUp() {
    const amount = Math.round(Number(topUp));
    if (!amount || amount <= 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await client.models.FundMovement.create({
        groupId: group.id,
        kind: "REPAY",
        amount,
        reason: `Top-up (${group.name})`,
        reasonEn: `Top-up (${group.name})`,
        createdAt: new Date().toISOString(),
      });
      await client.models.Group.update({
        id: group.id,
        emergencyFundBalance: balance + amount,
      });
      setTopUp("");
      await refreshGroup();
    } catch (e) {
      setError((e as Error)?.message ?? "topup-failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveTarget() {
    const amount = Math.round(Number(target));
    if (!Number.isFinite(amount) || amount < 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await client.models.Group.update({ id: group.id, emergencyFundTarget: amount });
      setTarget("");
      await refreshGroup();
    } catch (e) {
      setError((e as Error)?.message ?? "target-failed");
    } finally {
      setBusy(false);
    }
  }

  async function doRepay(row: Covered) {
    const amount = Math.round(Number(repayAmount));
    if (!amount || amount <= 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await client.models.FundMovement.create({
        groupId: group.id,
        cycleId: row.cycleId || undefined,
        kind: "REPAY",
        amount,
        reason: `Repayment by ${row.memberName}`,
        reasonEn: `Repayment by ${row.memberName}`,
        createdAt: new Date().toISOString(),
      });
      await client.models.Group.update({
        id: group.id,
        emergencyFundBalance: balance + amount,
      });
      setRepayFor(null);
      setRepayAmount("");
      await refreshGroup();
    } catch (e) {
      setError((e as Error)?.message ?? "repay-failed");
    } finally {
      setBusy(false);
    }
  }

  if (noGroups) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="panel mt-6 rounded-2xl px-5 py-14 text-center">
          <p className="text-base font-semibold">{fr ? "Aucun groupe pour l'instant" : "No groups yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {fr ? "Crée ton premier groupe pour gérer sa caisse de secours." : "Create your first group to manage its safety fund."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Tontine Flex · {fr ? "caisse de secours" : "safety fund"}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {fr ? "Caisse de secours" : "Emergency fund"}
          </h1>
          {groups.length > 1 && (
            <select
              value={group.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent/40"
              aria-label={fr ? "Choisir le groupe" : "Choose group"}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          {fr
            ? "La réserve collective : on l'alimente, elle avance les retards critiques, on suit les remboursements."
            : "The collective reserve: top it up, it covers critical lates, track the repayments."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        data-testid="dw-fund"
        className="panel-luminous mt-6 rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{group.name}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatMoney(balance, group.currency, locale)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {fr ? "objectif" : "target"} {formatMoney(fundTarget, group.currency, locale)} · {coverage}%
            </p>
          </div>
          <Badge tone={coverage >= 100 ? "ok" : coverage >= 50 ? "accent" : "warn"}>
            {coverage >= 100 ? (fr ? "Cible atteinte" : "Target met") : `${coverage}%`}
          </Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-subtle">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
            initial={{ width: 0 }}
            animate={{ width: `${coverage}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-4 grid gap-2 text-center sm:grid-cols-3">
          <div className="rounded-xl border border-border px-2 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted">{fr ? "Versé" : "Paid out"}</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(paidOutTotal, group.currency, locale)}</p>
          </div>
          <div className="rounded-xl border border-border px-2 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted">{fr ? "Remboursé" : "Repaid"}</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(repaidTotal, group.currency, locale)}</p>
          </div>
          <div className="rounded-xl border border-border px-2 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted">{fr ? "À récupérer" : "To recover"}</p>
            <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(coveredTotal, group.currency, locale)}</p>
          </div>
        </div>
      </motion.div>

      {backendOn && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="panel rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Wallet className="h-4 w-4" /> {fr ? "Alimenter" : "Top up"}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                inputMode="numeric"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={formatMoney(group.contributionAmount, group.currency, locale)}
                className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-accent/40"
              />
              <Button size="sm" onClick={doTopUp} disabled={busy || !Number(topUp)} className="gap-1.5 whitespace-nowrap">
                <Plus className="h-3.5 w-3.5" /> {fr ? "Verser" : "Add"}
              </Button>
            </div>
          </div>
          <div className="panel rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="h-4 w-4" /> {fr ? "Objectif" : "Target"}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={String(fundTarget)}
                className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-accent/40"
              />
              <Button size="sm" variant="secondary" onClick={saveTarget} disabled={busy || target === ""} className="whitespace-nowrap">
                {fr ? "Sauver" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm">{error}</p>
      )}

      <div className="panel mt-4 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <RotateCcw className="h-4 w-4" /> {fr ? "Remboursements à suivre" : "Repayments to track"}
        </h2>
        {!loaded ? (
          <p className="mt-3 text-sm text-muted">{fr ? "Chargement…" : "Loading…"}</p>
        ) : covered.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {fr ? "Aucune avance en cours — la caisse est intacte." : "No outstanding advances — the fund is intact."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {covered.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{c.memberName}</span>{" "}
                  <span className="text-muted">· {formatMoney(c.amount, group.currency, locale)}</span>
                </span>
                {repayFor === c.id ? (
                  <span className="flex gap-2">
                    <input
                      inputMode="numeric"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder={String(c.amount)}
                      className="w-28 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent/40"
                    />
                    <Button size="sm" onClick={() => doRepay(c)} disabled={busy || !Number(repayAmount)}>
                      OK
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => { setRepayFor(c.id); setRepayAmount(String(c.amount)); }}>
                    {fr ? "Enregistrer un remboursement" : "Record repayment"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel mt-4 rounded-2xl p-5">
        <h2 className="text-sm font-semibold">{fr ? "Mouvements" : "Movements"}</h2>
        {!loaded ? (
          <p className="mt-3 text-sm text-muted">{fr ? "Chargement…" : "Loading…"}</p>
        ) : movements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {fr ? "Aucun mouvement — verse la dotation initiale ci-dessus." : "No movements yet — add the initial top-up above."}
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <Badge tone={m.kind === "DEBIT" ? "warn" : "ok"}>
                    {m.kind === "DEBIT" ? (fr ? "Sortie" : "Out") : fr ? "Entrée" : "In"}
                  </Badge>{" "}
                  <span className="text-muted">{m.reason ?? ""}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  {m.kind === "DEBIT" ? "−" : "+"}
                  {formatMoney(m.amount, group.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
