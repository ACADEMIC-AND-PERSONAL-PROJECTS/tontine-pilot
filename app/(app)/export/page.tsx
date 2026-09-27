"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  currentCycle,
  fakeContributions,
  fakeGroup,
  fakeMembers,
  pastCycles,
} from "@/lib/fake-data";
import { formatDate, formatFCFA, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Check } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { contributionText, type Contribution } from "@/lib/fake-data";
import { useRemoteCycleData } from "@/lib/use-remote";
import { useGroups } from "@/lib/groups";
import { isBackendEnabled } from "@/lib/backend";

function buildCsv(rows: Contribution[]) {
  const header = "Membre,Montant,Statut,Date,Déclaration\n";
  return (
    header +
    rows
      .map(
        (c) =>
          `"${c.memberName}",${c.amount},${c.status},"${c.dateDeclared}","${(c.rawText || "").replace(/"/g, '""')}"`
      )
      .join("\n")
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [downloaded, setDownloaded] = useState<"csv" | "pdf" | null>(null);
  const { active } = useGroups();
  const backendOn = isBackendEnabled();
  const { groups, synced } = useGroups();
  const noGroups = backendOn && synced && groups.length === 0;
  const remote = useRemoteCycleData(active.id);
  const contributions = backendOn ? remote.contributions : fakeContributions;

  function exportCsv() {
    downloadBlob(
      buildCsv(contributions),
      `registre-cycle-${currentCycle.cycleNumber}.csv`,
      "text/csv;charset=utf-8"
    );
    setDownloaded("csv");
    setTimeout(() => setDownloaded(null), 2500);
  }

  function exportPdfSim() {
    const text = [
      `TontinePilot — Registre ${fakeGroup.name}`,
      `Cycle ${currentCycle.cycleNumber} · Bénéficiaire: ${currentCycle.recipientName}`,
      `Période: ${currentCycle.startDate} → ${currentCycle.endDate}`,
      `Collecté: ${currentCycle.totalCollected} / ${currentCycle.totalExpected} FCFA`,
      "",
      ...contributions.map(
        (c) =>
          `${c.memberName.padEnd(22)} ${String(c.amount).padStart(8)}  ${c.status.padEnd(10)}  ${c.dateDeclared || "—"}`
      ),
      "",
      "Document généré pour démonstration — pas un PDF binaire.",
    ].join("\n");
    downloadBlob(text, `registre-cycle-${currentCycle.cycleNumber}.txt`, "text/plain");
    setDownloaded("pdf");
    setTimeout(() => setDownloaded(null), 2500);
  }

  if (noGroups) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="panel mt-6 rounded-2xl px-5 py-14 text-center">
          <p className="text-base font-semibold">{fr ? "Aucun groupe pour l'instant" : "No groups yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {fr ? "Crée ton premier groupe pour exporter son registre." : "Create your first group to export its ledger."}
          </p>
          <Link href="/group/new" className="mt-5 inline-block">
            <Button size="sm">{fr ? "Créer un groupe" : "Create a group"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {fr ? "Transparence" : "Transparency"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {fr ? "Exporter le registre" : "Export the ledger"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {fr
            ? "Coupez court aux disputes — registre complet du cycle en CSV ou aperçu imprimable."
            : "End disputes early — full cycle ledger as CSV or printable preview."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 flex flex-wrap gap-3"
      >
        <Button data-testid="dw-export-csv" onClick={exportCsv} className="gap-2">
          {downloaded === "csv" ? (
            <Check className="h-4 w-4" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          {downloaded === "csv" ? "CSV téléchargé" : fr ? "Télécharger CSV" : "Download CSV"}
        </Button>
        <Button variant="secondary" onClick={exportPdfSim} className="gap-2">
          {downloaded === "pdf" ? (
            <Check className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {downloaded === "pdf" ? fr ? "Export prêt" : "Export ready" : fr ? "Aperçu imprimable" : "Printable preview"}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        data-testid="dw-export"
        className="panel mt-8 overflow-hidden rounded-2xl"
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                {fakeGroup.name}
              </h2>
              <p className="text-xs text-muted">
                Cycle {currentCycle.cycleNumber} · {currentCycle.recipientName} ·{" "}
                {formatDate(currentCycle.startDate, locale)} →{" "}
                {formatDate(currentCycle.endDate, locale)}
              </p>
            </div>
            <Badge tone="accent">
              {formatMoney(currentCycle.totalCollected, active.currency, locale)} /{" "}
              {formatMoney(currentCycle.totalExpected, active.currency, locale)}
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium sm:px-6">{fr ? "Membre" : "Member"}</th>
                  <th className="px-3 py-3 font-medium">{fr ? "Montant" : "Amount"}</th>
                  <th className="px-3 py-3 font-medium">{fr ? "Statut" : "Status"}</th>
                  <th className="px-3 py-3 font-medium">{fr ? "Date" : "Date"}</th>
                  <th className="px-5 py-3 font-medium sm:px-6">{fr ? "Déclaration" : "Declaration"}</th>
                </tr>
            </thead>
            <tbody>
              {contributions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                    {fr ? "Rien à exporter pour l'instant." : "Nothing to export yet."}
                  </td>
                </tr>
              )}
              {contributions.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/60 last:border-0 hover:bg-bg-subtle/50"
                >
                  <td className="px-5 py-3 font-medium sm:px-6">{c.memberName}</td>
                  <td className="px-3 py-3 tabular-nums text-muted">
                    {c.amount ? formatMoney(c.amount, active.currency, locale) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      tone={
                        c.status === "CONFIRMED"
                          ? "ok"
                          : c.status === "LATE"
                            ? "danger"
                            : "warn"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {c.dateDeclared ? formatDate(c.dateDeclared, locale) : "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-xs text-muted sm:px-6">
                    {contributionText(c, locale) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex items-start gap-2 text-xs text-muted"
      >
        <Download className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {fr ? `Historique : ${pastCycles.length} cycles clos · ` : `History: ${pastCycles.length} closed cycles · `}
          {fakeMembers.length}{" "}
          {fr ? "membres · devise" : "members · currency"} {fakeGroup.currency}.{" "}
          {fr
            ? "Aucun paiement réel n'est traité par TontinePilot."
            : "No real payments are processed by TontinePilot."}
        </p>
      </motion.div>
    </div>
  );
}
