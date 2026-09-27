"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  Wand2,
  ImageIcon,
  Type,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { fakeMembers, fakeGroup, fakeOcrReceipt } from "@/lib/fake-data";
import { formatFCFA, cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useGroups } from "@/lib/groups";
import { client, isBackendEnabled } from "@/lib/backend";
import { useRemoteMembers } from "@/lib/use-remote";
import { useRemoteCycleData } from "@/lib/use-remote";
import { AddMemberModal } from "@/components/app/add-member-modal";
import { uploadData } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";

type Mode = "text" | "ocr";

type ParsedText = {
  kind: "text";
  amount: number;
  recipientName: string | null;
  memberId: string | null;
  memberName: string;
  confidence: number;
  raw: string;
};

type ParsedOcr = {
  kind: "ocr";
  amount: number;
  recipientName: string;
  transactionId: string;
  date: string;
  provider: string;
  confidence: number;
  fileName: string;
};

type Parsed = ParsedText | ParsedOcr;

const examplesFr = [
  "J'ai payé 20000 pour Cheikh ce mois",
  "Cotisation de Awa : vingt mille versés",
  "Moussa a donné ses 20k à Aïssatou",
];

const examplesEn = [
  "I paid 20000 for Cheikh this month",
  "Awa's contribution: twenty thousand paid",
  "Moussa gave his 20k to Aïssatou",
];

function fakeParse(text: string): ParsedText {
  const lower = text.toLowerCase();
  const amountMatch = text.match(/(\d[\d\s]*\d|\d+)/);
  let amount = fakeGroup.contributionAmount;
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/\s/g, ""), 10);
    if (amount < 1000) amount = amount * 1000;
  }
  if (/vingt\s*mille|20k|20\s*k/i.test(text)) amount = 20000;

  // Strict like the backend: unknown names resolve to "" (unknown), never
  // to another member. The UI blocks and proposes adding them to the group.
  const words = lower.split(/[^a-zàâäéèêëîïôöùûüç0-9]+/i).filter(Boolean);
  let member = fakeMembers.find((m) => lower.includes(m.name.toLowerCase())) ?? null;
  if (!member) {
    const firsts = fakeMembers.filter((m) =>
      words.some(
        (w) =>
          m.name.split(" ")[0].toLowerCase().startsWith(w) ||
          w.startsWith(m.name.split(" ")[0].toLowerCase())
      )
    );
    member = firsts.length === 1 ? firsts[0] : null;
  }

  const recipient = member
    ? (fakeMembers.find(
        (m) =>
          m.id !== member.id && lower.includes(m.name.toLowerCase())
      ) ?? null)
    : null;

  return {
    kind: "text",
    amount,
    recipientName: recipient?.name ?? "",
    memberId: member?.id ?? null,
    memberName: member?.name ?? "",
    confidence: member ? 0.86 + Math.random() * 0.12 : 0.35,
    raw: text,
  };
}

export default function DeclarePage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const examples = fr ? examplesFr : examplesEn;
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { active, groups, synced } = useGroups();
  const backendOn = isBackendEnabled();
  const noGroups = backendOn && synced && groups.length === 0;
  const { members: remoteMembers } = useRemoteMembers(active.id);
  const knownMembers = isBackendEnabled() ? remoteMembers : fakeMembers;
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  // Backend failure message (shown as a banner). Demo dataset (backend off)
  // is the only path that uses the canned parsers.
  const [parseError, setParseError] = useState<string | null>(null);
  // Unknown payer flow: name typed but no group member matches.
  const [showAddMember, setShowAddMember] = useState(false);
  const [addCycles, setAddCycles] = useState<Array<{ id: string; cycleNumber: number; status?: string | null; endDate?: string | null; totalExpected?: number | null }>>([]);
  // Manual entry after an unreadable receipt.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [ocrPayerId, setOcrPayerId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  async function remoteParse(text: string) {
    const res = await client.queries.parseDeclaration({ text, groupId: active.id });
    if (res.errors?.length) throw new Error(res.errors[0].message);
    const p = res.data;
    if (!p || p.amount == null) throw new Error("empty-parse");
    return {
      kind: "text" as const,
      amount: p.amount,
      // Empty memberName = unknown payer (UI blocks + proposes adding them).
      // Empty recipient = cycle recipient (resolved at confirm time).
      recipientName: p.recipientName ?? "",
      memberId: p.memberId ?? null,
      memberName: p.memberName ?? "",
      confidence: p.confidence ?? 0.5,
      raw: text,
    };
  }

  async function handleParse() {
    if (!text.trim()) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }
    setLoading(true);
    setConfirmed(false);
    setParsed(null);
    setParseError(null);
    setDuplicate(false);
    setConfirmError(null);
    try {
      if (isBackendEnabled()) {
        try {
          setParsed(await remoteParse(text));
        } catch (e) {
          setParseError(
            fr
              ? `Analyse impossible : ${(e as Error)?.message ?? "erreur"}. Réessaie ou vérifie la connexion.`
              : `Parse failed: ${(e as Error)?.message ?? "error"}. Retry or check connection.`
          );
        }
      } else {
        await new Promise((r) => setTimeout(r, 1100));
        setParsed(fakeParse(text));
      }
    } finally {
      setLoading(false);
    }
  }

  async function openAddMember() {
    try {
      const cycles = await client.models.Cycle.list({
        filter: { groupId: { eq: active.id } },
      });
      setAddCycles(
        ((cycles.data ?? []) as Array<{ id: string; cycleNumber: number; status?: string | null; endDate?: string | null; totalExpected?: number | null }>).map(
          (c) => ({ id: c.id, cycleNumber: c.cycleNumber, status: c.status, endDate: c.endDate, totalExpected: c.totalExpected })
        )
      );
    } catch {
      setAddCycles([]);
    }
    setShowAddMember(true);
  }

  async function handleOcrFile(file: File) {
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setConfirmed(false);
    setParsed(null);
    setReceiptKey(null);
    setParseError(null);
    setManualOpen(false);
    setDuplicate(false);
    try {
      if (isBackendEnabled()) {
        // Storage rule is receipts/{identityId}/* — group id would be rejected.
        const { identityId } = await fetchAuthSession();
        if (!identityId) throw new Error("no-identity");
        const key = `receipts/${identityId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        await uploadData({ path: key, data: file }).result;
        setReceiptKey(key);
        const res = await client.queries.parseReceipt({ s3Key: key, groupId: active.id });
        if (res.errors?.length) throw new Error(res.errors[0].message);
        const ocr = res.data;
        // Unreadable receipt (logo, blurry photo, no amount found): no
        // fabricated payment — error + manual entry instead.
        if (!ocr || ocr.amount == null) {
          setParseError(
            fr
              ? "Reçu illisible : aucun montant détecté. Vérifie la photo ou saisis le montant manuellement."
              : "Unreadable receipt: no amount detected. Check the photo or enter the amount manually."
          );
          setManualOpen(true);
          return;
        }
        setParsed({
          kind: "ocr",
          amount: ocr.amount,
          recipientName: ocr.recipientName ?? "",
          transactionId: ocr.transactionId ?? "",
          date: ocr.date ?? "",
          provider: ocr.provider ?? "",
          confidence: ocr.confidence ?? 0.5,
          fileName: file.name,
        });
        setOcrPayerId("");
        return;
      }
      await new Promise((r) => setTimeout(r, 1400));
      const demo = fakeOcrReceipt(file.name);
      setParsed({
        kind: "ocr",
        amount: demo.amount,
        recipientName: demo.recipientName,
        transactionId: demo.transactionId,
        date: demo.date,
        provider: demo.provider,
        confidence: demo.confidence,
        fileName: file.name,
      });
    } catch (e) {
      setParseError(
        fr
          ? `Lecture du reçu impossible : ${(e as Error)?.message ?? "erreur"}. Réessaie ou saisis manuellement.`
          : `Receipt read failed: ${(e as Error)?.message ?? "error"}. Retry or enter manually.`
      );
      setManualOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const router = useRouter();
  const remoteCycle = useRemoteCycleData(active.id);

  async function refreshTotals(cycleId: string) {
    try {
      const all = await client.models.Contribution.list({ filter: { cycleId: { eq: cycleId } } });
      const sum = ((all.data ?? []) as Array<{ status?: string; amount?: number }>).reduce(
        (n, c) => n + (c.status === "CONFIRMED" ? (c.amount ?? 0) : 0),
        0
      );
      await client.models.Cycle.update({ id: cycleId, totalCollected: sum });
      await client.models.Group.update({ id: active.id, cycleCollected: sum });
    } catch {
      // totals recompute is best-effort; dashboard still refreshes
    }
  }

  /** Settle a confirmed payment: resolve the member's open late alerts for
   *  the cycle, then rebuild trust from unresolved lates + completed cycles.
   *  Trust heals when members pay — it is not a life sentence. */
  async function settleMemberAfterPayment(memberId: string, cycleId: string) {
    try {
      const alerts = await client.models.Alert.list({
        filter: { groupId: { eq: active.id } },
      });
      const mine = (alerts.data ?? []).filter(
        (a) => a.memberId === memberId && !a.resolved && a.type === "LATE_PAYMENT"
      );
      for (const a of mine.filter((x) => !x.cycleId || x.cycleId === cycleId)) {
        await client.models.Alert.update({ id: a.id, resolved: true }).catch(() => null);
      }
      const remaining = mine.filter((x) => x.cycleId && x.cycleId !== cycleId).length;
      const row = await client.models.Member.get({ id: memberId });
      const prev = (row.data ?? {}) as { cyclesCompleted?: number | null };
      const cyclesCompleted = (prev.cyclesCompleted ?? 0) + 1;
      const lateCount = remaining;
      const trustScore = Math.max(
        50,
        Math.min(99, 92 - lateCount * 7 + Math.min(6, cyclesCompleted))
      );
      await client.models.Member.update({ id: memberId, lateCount, trustScore, cyclesCompleted }).catch(
        () => null
      );
    } catch {
      // trust rebuild is best-effort; the payment itself is recorded
    }
  }

  async function handleConfirm() {
    if (confirming) return;
    // Manual entry (unreadable receipt) has no parsed result — payer + amount
    // come from the manual form.
    if (!parsed && !manualOpen) return;
    setConfirmError(null);
    setDuplicate(false);
    if (!isBackendEnabled()) {
      // Demo dataset: confirmation screen is the proof (no writes).
      setConfirmed(true);
      return;
    }
    // Strict payer resolution — no silent fallback to another member.
    // Text: the parsed member must exist in this group (unknown payers are
    // blocked upstream with an add-member CTA). OCR/manual: payer is chosen.
    let payerId = "";
    let payerName = "";
    if (parsed && parsed.kind === "text") {
      const hit =
        (parsed as { memberId?: string }).memberId &&
        knownMembers.some((m) => m.id === (parsed as { memberId?: string }).memberId)
          ? knownMembers.find((m) => m.id === (parsed as { memberId?: string }).memberId)!
          : knownMembers.find(
              (m) => m.name.toLowerCase() === parsed.memberName.toLowerCase()
            );
      if (!hit) {
        setConfirmError(
          fr
            ? "Payeur introuvable dans ce groupe. Ajoute-le d'abord."
            : "Payer not found in this group. Add them first."
        );
        return;
      }
      payerId = hit.id;
      payerName = hit.name;
    } else {
      const hit = knownMembers.find((m) => m.id === ocrPayerId);
      if (!hit) {
        setConfirmError(
          fr ? "Choisis le payeur avant de confirmer." : "Select the payer before confirming."
        );
        return;
      }
      payerId = hit.id;
      payerName = hit.name;
    }
    setConfirming(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Target the group's OPEN cycle (never a hardcoded id).
      let cycleId = remoteCycle.cycle?.id;
        if (!cycleId) {
          const cycles = await client.models.Cycle.list({
            filter: { groupId: { eq: active.id }, status: { eq: "OPEN" } },
          });
          cycleId = cycles.data?.[0]?.id;
        }
        if (!cycleId) {
          const created = await client.models.Cycle.create({
            groupId: active.id,
            cycleNumber: 1,
            startDate: today,
            endDate: today,
            status: "OPEN",
            totalExpected: active.contributionAmount * Math.max(active.memberCount, 1),
            totalCollected: 0,
          });
          cycleId = created.data?.id;
        }
        if (!cycleId) throw new Error("no-cycle");
        // Idempotency: one CONFIRMED contribution per member per cycle.
        const prior = await client.models.Contribution.list({
          filter: { cycleId: { eq: cycleId } },
        });
        const already = (prior.data ?? []).find(
          (c) => c.memberId === payerId && c.status === "CONFIRMED"
        );
        if (already) {
          setDuplicate(true);
          setConfirming(false);
          return;
        }
        if (parsed && parsed.kind === "text") {
          await client.models.Contribution.create({
            groupId: active.id,
            cycleId,
            memberId: payerId,
            memberName: payerName,
            amount: parsed.amount,
            status: "CONFIRMED",
            dateDeclared: today,
            rawText: parsed.raw,
            rawTextEn: parsed.raw,
            method: "TEXT_NLU",
          });
        } else if (manualOpen) {
          const manual = Math.round(Number(manualAmount));
          if (!manual || manual <= 0) throw new Error("bad-amount");
          await client.models.Contribution.create({
            groupId: active.id,
            cycleId,
            memberId: payerId,
            memberName: payerName,
            amount: manual,
            status: "CONFIRMED",
            dateDeclared: today,
            rawText: fileName || text,
            method: "MANUAL",
          });
        } else if (!parsed) {
          throw new Error("no-data");
        } else {
          // OCR receipt: the payer is chosen (receipts name the recipient,
          // rarely the payer) — never a hardcoded member id.
          await client.models.Contribution.create({
            groupId: active.id,
            cycleId,
            memberId: payerId,
            memberName: payerName,
            amount: parsed.amount,
            status: "CONFIRMED",
            dateDeclared: parsed.date || today,
            method: "OCR_RECEIPT",
            transactionId: parsed.transactionId || undefined,
            receiptKey: receiptKey ?? undefined,
          });
        }
        await settleMemberAfterPayment(payerId, cycleId);
        await refreshTotals(cycleId);
        setConfirmed(true);
        // let the user see the confirmation, then land on refreshed numbers
        window.setTimeout(() => router.push("/dashboard"), 1800);
      } catch (e) {
        setConfirmError(
          fr
            ? `Enregistrement impossible : ${(e as Error)?.message ?? "erreur"}.`
            : `Could not record: ${(e as Error)?.message ?? "error"}.`
        );
      } finally {
        setConfirming(false);
      }
  }

  function reset() {
    setConfirmed(false);
    setParsed(null);
    setText("");
    setPreview(null);
    setFileName("");
    setParseError(null);
    setManualOpen(false);
    setManualAmount("");
    setOcrPayerId("");
    setDuplicate(false);
    setConfirmError(null);
    setShowAddMember(false);
  }

  if (noGroups) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="panel mt-6 rounded-2xl px-5 py-14 text-center">
          <p className="text-base font-semibold">{fr ? "Aucun groupe pour l'instant" : "No groups yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {fr ? "Crée ton premier groupe avant de déclarer une cotisation." : "Create your first group before declaring a contribution."}
          </p>
          <Link href="/group/new" className="mt-5 inline-block">
            <Button size="sm">{fr ? "Créer un groupe" : "Create a group"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Bedrock NLU · Vision OCR · {fr ? "démo" : "demo"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {fr ? "Déclarer une cotisation" : "Declare a contribution"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {fr
            ? "Texte libre ou capture Mobile Money — l'IA structure le paiement."
            : "Free text or Mobile Money screenshot — AI structures the payment."}
        </p>
      </motion.div>

      <div className="mt-6 flex gap-1 rounded-xl border border-border bg-bg-raised p-1">
        {(
          [
            { id: "text" as const, label: fr ? "Message texte" : "Text message", icon: Type },
            { id: "ocr" as const, label: fr ? "Reçu Mobile Money" : "Mobile Money receipt", icon: ImageIcon },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={t.id === "ocr" ? "dw-ocr-tab" : undefined}
            onClick={() => {
              setMode(t.id);
              setParsed(null);
              setConfirmed(false);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
              mode === t.id
                ? "bg-accent-glow text-accent-hover"
                : "text-muted hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.id === "text" ? (fr ? "Texte" : "Text") : "OCR"}</span>
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-5"
      >
        {mode === "text" ? (
          <motion.div
            animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            data-testid="dw-declare"
            className="panel-luminous rounded-2xl p-5 sm:p-6"
          >
            <label className="text-xs font-medium uppercase tracking-wider text-muted">
              {fr ? "Message libre" : "Free message"}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={fr ? 'Ex. "J\'ai payé 20000 pour Cheikh ce mois"' : 'E.g. "I paid 20000 for Cheikh this month"'}
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-lg border border-border bg-bg-subtle/50 px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/30 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
            <Button
              data-testid="dw-parse"
              onClick={handleParse}
              disabled={loading}
              className="mt-5 w-full gap-2 sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {fr ? "Analyse Bedrock…" : "Bedrock analysis…"}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {fr ? "Parser avec l'IA" : "Parse with AI"}
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <div className="panel-luminous rounded-2xl p-5 sm:p-6">
            <label className="text-xs font-medium uppercase tracking-wider text-muted">
              {fr ? "Capture Wave / Orange Money / MTN" : "Wave / Orange Money / MTN screenshot"}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleOcrFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-10 text-center transition-colors hover:border-accent/40 hover:bg-accent-glow/30"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Reçu"
                  className="max-h-40 rounded-lg object-contain"
                />
              ) : (
                <Upload className="h-8 w-8 text-accent-hover" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {fileName || (fr ? "Déposer une capture d'écran" : "Drop a screenshot")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {fr
                    ? "Bedrock Vision extrait montant, ID transaction, date"
                    : "Bedrock Vision extracts amount, transaction ID, date"}
                </p>
              </div>
            </button>
            {loading && (
              <p className="mt-4 flex items-center gap-2 text-sm text-accent-hover">
                <Loader2 className="h-4 w-4 animate-spin" />
                {fr ? "OCR en cours…" : "OCR in progress…"}
              </p>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {parseError && !parsed && !confirmed && (
            <motion.div
              key="parse-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm"
            >
              {parseError}
            </motion.div>
          )}
          {parsed && parsed.kind === "text" && !parsed.memberName && !confirmed && (
            <motion.div
              key="unknown-member"
              data-testid="dw-unknown-member"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 sm:p-6"
            >
              <h2 className="font-semibold">
                {fr ? "Payeur inconnu" : "Unknown payer"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {fr ? (
                  <>« {parsed.raw} » — cette personne n’est pas membre de <b>{active.name}</b>. Ajoute-la pour enregistrer ce paiement avec rattrapage de ses dus.</>
                ) : (
                  <>“{parsed.raw}” — this person is not a member of <b>{active.name}</b>. Add them to record this payment with catch-up of their dues.</>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {backendOn ? (
                  <Button onClick={openAddMember}>
                    {fr ? "Ajouter au groupe" : "Add to group"}
                  </Button>
                ) : (
                  <span className="text-sm text-muted">
                    {fr ? "Ajoute ce membre via la création de groupe (mode démo)." : "Add this member via group creation (demo mode)."}
                  </span>
                )}
                <Button variant="ghost" onClick={() => { setParsed(null); setText(""); }}>
                  {fr ? "Corriger le texte" : "Fix the text"}
                </Button>
              </div>
            </motion.div>
          )}
          {parsed && !confirmed && (parsed.kind !== "text" || parsed.memberName) && (
            <motion.div
              key="result"
              data-testid="dw-parse-result"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="shadow-elevate-medium mt-5 rounded-2xl border border-border bg-bg-raised p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">
                  {parsed.kind === "ocr"
                    ? fr ? "Reçu validé" : "Receipt validated"
                    : fr ? "Résultat structuré" : "Structured result"}
                </h2>
                <Badge tone="accent">
                  {Math.round(parsed.confidence * 100)}% {fr ? "confiance" : "confidence"}
                </Badge>
                <Badge tone="muted">
                  {parsed.kind === "ocr" ? "OCR_RECEIPT" : "TEXT_NLU"}
                </Badge>
              </div>

              {parsed.kind === "text" ? (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Membre" : "Member"}
                    </dt>
                    <dd className="mt-1.5 flex items-center gap-2">
                      <Avatar name={parsed.memberName} size="sm" />
                      <span className="text-sm font-medium">
                        {parsed.memberName}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Montant" : "Amount"}
                    </dt>
                    <dd className="mt-1.5 text-xl font-semibold tabular-nums">
                      {formatFCFA(parsed.amount, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Bénéficiaire" : "Recipient"}
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium">
                      {parsed.recipientName || remoteCycle.cycle?.recipientName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Texte" : "Text"}
                    </dt>
                    <dd className="mt-1.5 text-sm italic text-muted">
                      « {parsed.raw} »
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Opérateur" : "Provider"}
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium">
                      {parsed.provider}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Montant" : "Amount"}
                    </dt>
                    <dd className="mt-1.5 text-xl font-semibold tabular-nums">
                      {formatFCFA(parsed.amount, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "ID transaction" : "Transaction ID"}
                    </dt>
                    <dd className="mt-1.5 font-mono text-sm">
                      {parsed.transactionId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {fr ? "Destinataire · date" : "Recipient · date"}
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium">
                      {parsed.recipientName || remoteCycle.cycle?.recipientName || "—"} · {parsed.date}
                    </dd>
                  </div>
                </dl>
              )}
              {parsed.kind === "ocr" && (
                <div className="mt-5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted">
                    {fr ? "Payeur (reçu = destinataire, pas payeur)" : "Payer (receipts name the recipient, not the payer)"}
                  </label>
                  <select
                    value={ocrPayerId}
                    onChange={(e) => setOcrPayerId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40"
                  >
                    <option value="">
                      {fr ? "Choisir le payeur…" : "Select the payer…"}
                    </option>
                    {knownMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {duplicate && (
                <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm">
                  {fr
                    ? "Déjà enregistré : ce membre a une cotisation confirmée pour ce cycle."
                    : "Already recorded: this member has a confirmed contribution for this cycle."}
                </p>
              )}
              {confirmError && (
                <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm">
                  {confirmError}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={handleConfirm} disabled={confirming} className="gap-1.5">
                  {confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {fr ? "Confirmer l'enregistrement" : "Confirm entry"}
                </Button>
                <Button variant="ghost" onClick={() => setParsed(null)}>
                  {fr ? "Annuler" : "Cancel"}
                </Button>
              </div>
            </motion.div>
          )}
          {manualOpen && !parsed && !confirmed && (
            <motion.div
              key="manual"
              data-testid="dw-manual-entry"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="mt-5 rounded-2xl border border-border bg-bg-raised p-5 sm:p-6"
            >
              <h2 className="font-semibold">
                {fr ? "Saisie manuelle" : "Manual entry"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {fr
                  ? "Le reçu est illisible : saisis le montant et le payeur, on enregistre proprement."
                  : "The receipt is unreadable: enter the amount and payer, recorded cleanly."}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted">
                    {fr ? "Montant (FCFA)" : "Amount (FCFA)"}
                  </label>
                  <input
                    inputMode="numeric"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="20000"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-accent/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted">
                    {fr ? "Payeur" : "Payer"}
                  </label>
                  <select
                    value={ocrPayerId}
                    onChange={(e) => setOcrPayerId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40"
                  >
                    <option value="">
                      {fr ? "Choisir…" : "Select…"}
                    </option>
                    {knownMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {confirmError && (
                <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm">
                  {confirmError}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={handleConfirm} disabled={confirming} className="gap-1.5">
                  {confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {fr ? "Enregistrer" : "Record"}
                </Button>
                <Button variant="ghost" onClick={() => { setManualOpen(false); setParseError(null); }}>
                  {fr ? "Annuler" : "Cancel"}
                </Button>
              </div>
            </motion.div>
          )}

          {confirmed && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 flex flex-col items-center rounded-2xl border border-ok/30 bg-ok/10 px-6 py-10 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok/20 text-ok">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <p className="mt-4 text-xl font-semibold">
                {fr ? "Cotisation enregistrée" : "Contribution recorded"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {fr ? "Simulation démo — pas de backend AWS facturé" : "Demo simulation — no billed AWS backend"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-5"
                onClick={reset}
              >
                {fr ? "Nouvelle déclaration" : "New declaration"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AddMemberModal
        groupId={active.id}
        groupName={active.name}
        contributionAmount={active.contributionAmount}
        cycles={addCycles}
        initialName={parsed?.kind === "text" && !parsed.memberName ? parsed.raw.slice(0, 40) : ""}
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        onAdded={() => {
          // Member now exists: re-parse so the payer resolves, then confirm.
          setShowAddMember(false);
          if (text.trim()) void handleParse();
        }}
      />
    </div>
  );
}
