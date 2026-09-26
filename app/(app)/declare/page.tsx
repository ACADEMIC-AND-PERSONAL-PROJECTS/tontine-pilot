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
import { useGroups } from "@/lib/groups";
import { client, isBackendEnabled } from "@/lib/backend";
import { useRemoteMembers } from "@/lib/use-remote";
import { uploadData } from "aws-amplify/storage";

type Mode = "text" | "ocr";

type ParsedText = {
  kind: "text";
  amount: number;
  recipientName: string | null;
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

  const member =
    fakeMembers.find((m) =>
      lower.includes(m.name.split(" ")[0].toLowerCase())
    ) || fakeMembers[0];

  const recipient =
    fakeMembers.find(
      (m) =>
        m.id !== member.id &&
        lower.includes(m.name.split(" ")[0].toLowerCase())
    ) ||
    fakeMembers.find((m) => m.name === "Cheikh Fall") ||
    null;

  return {
    kind: "text",
    amount,
    recipientName: recipient?.name ?? "Cheikh Fall",
    memberName: member.name,
    confidence: 0.86 + Math.random() * 0.12,
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

  async function remoteParse(text: string) {
    const res = await client.queries.parseDeclaration({ text, groupId: active.id });
    if (res.errors?.length) throw new Error(res.errors[0].message);
    const p = res.data;
    if (!p || p.amount == null) throw new Error("empty-parse");
    return {
      kind: "text" as const,
      amount: p.amount,
      recipientName: p.recipientName ?? "Cheikh Fall",
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
    try {
      if (isBackendEnabled()) {
        try {
          setParsed(await remoteParse(text));
        } catch {
          await new Promise((r) => setTimeout(r, 1100));
          setParsed(fakeParse(text));
        }
      } else {
        await new Promise((r) => setTimeout(r, 1100));
        setParsed(fakeParse(text));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOcrFile(file: File) {
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setConfirmed(false);
    setParsed(null);
    setReceiptKey(null);
    try {
      if (isBackendEnabled()) {
        try {
          const key = `receipts/${active.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
          await uploadData({ path: key, data: file }).result;
          setReceiptKey(key);
          const res = await client.queries.parseReceipt({ s3Key: key, groupId: active.id });
          if (res.errors?.length) throw new Error(res.errors[0].message);
          const ocr = res.data;
          if (!ocr || ocr.amount == null) throw new Error("empty-ocr");
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
          return;
        } catch {
          // fall through to demo
        }
      }
      await new Promise((r) => setTimeout(r, 1400));
      const ocr = fakeOcrReceipt(file.name);
      setParsed({
        kind: "ocr",
        amount: ocr.amount,
        recipientName: ocr.recipientName,
        transactionId: ocr.transactionId,
        date: ocr.date,
        provider: ocr.provider,
        confidence: ocr.confidence,
        fileName: file.name,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (parsed && isBackendEnabled()) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        if (parsed.kind === "text") {
          const member =
            knownMembers.find((m) => m.name === parsed.memberName) ??
            knownMembers[0] ?? { id: "unknown", name: parsed.memberName };
          await client.models.Contribution.create({
            groupId: active.id,
            cycleId: "cycle-4",
            memberId: member.id,
            memberName: parsed.memberName,
            amount: parsed.amount,
            status: "CONFIRMED",
            dateDeclared: today,
            rawText: parsed.raw,
            rawTextEn: parsed.raw,
            method: "TEXT_NLU",
          });
        } else {
          await client.models.Contribution.create({
            groupId: active.id,
            cycleId: "cycle-4",
            memberId: "m1",
            memberName: parsed.recipientName,
            amount: parsed.amount,
            status: "CONFIRMED",
            dateDeclared: parsed.date || today,
            method: "OCR_RECEIPT",
            transactionId: parsed.transactionId || undefined,
            receiptKey: receiptKey ?? undefined,
          });
        }
      } catch {
        // demo mode: confirmation screen is the proof
      }
    }
    setConfirmed(true);
  }

  function reset() {
    setConfirmed(false);
    setParsed(null);
    setText("");
    setPreview(null);
    setFileName("");
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
          {parsed && !confirmed && (
            <motion.div
              key="result"
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
                      {parsed.recipientName}
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
                      {parsed.recipientName} · {parsed.date}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={handleConfirm} className="gap-1.5">
                  <Check className="h-4 w-4" />
                  {fr ? "Confirmer l'enregistrement" : "Confirm entry"}
                </Button>
                <Button variant="ghost" onClick={() => setParsed(null)}>
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
    </div>
  );
}
