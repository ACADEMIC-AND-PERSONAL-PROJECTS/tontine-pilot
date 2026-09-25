"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { recommendRotationOrder, type Member, type Group } from "@/lib/fake-data";
import { useGroups } from "@/lib/groups";
import { client, isBackendEnabled } from "@/lib/backend";
import { ArrowRight, ArrowLeft, Check, Plus, X, Sparkles, MailWarning, History } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MemberDraft = {
  name: string;
  email: string;
  phone: string;
  lateCount: number;
  cycles: number;
};

type Form = {
  name: string;
  description: string;
  amount: string;
  frequency: "WEEKLY" | "MONTHLY";
  members: MemberDraft[];
  useAiOrder: boolean;
};

const stepsFr = ["Groupe", "Cotisation", "Membres", "Rotation IA", "Confirmation"];
const stepsEn = ["Group", "Contribution", "Members", "AI rotation", "Confirm"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trustFor(d: MemberDraft) {
  return Math.max(50, Math.min(99, 92 - d.lateCount * 7 + Math.min(6, d.cycles)));
}

function toMember(d: MemberDraft, i: number): Member {
  return {
    id: `new-${i}-${d.name}`,
    name: d.name || (i + 1).toString(),
    phone: d.phone,
    email: d.email,
    joinedAt: "",
    trustScore: trustFor(d),
    lateCount: d.lateCount,
    cyclesCompleted: d.cycles,
  };
}

const seedMembers: MemberDraft[] = [
  { name: "Aïssatou Diallo", email: "aissatou.diallo@exemple.sn", phone: "+221 77 123 45 67", lateCount: 0, cycles: 4 },
  { name: "Moussa Ndiaye", email: "moussa.ndiaye@exemple.sn", phone: "+221 76 234 56 78", lateCount: 0, cycles: 4 },
  { name: "Ibrahima Sow", email: "ibrahima.sow@exemple.sn", phone: "+221 78 678 90 12", lateCount: 3, cycles: 4 },
  { name: "Fatou Mbaye", email: "fatou.mbaye@exemple.sn", phone: "+221 76 567 89 01", lateCount: 0, cycles: 3 },
];

export default function NewGroupPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const steps = fr ? stepsFr : stepsEn;
  const router = useRouter();
  const { addGroup } = useGroups();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<Form>({
    name: "",
    description: "",
    amount: "20000",
    frequency: "MONTHLY",
    members: seedMembers,
    useAiOrder: true,
  });

  const aiOrder = useMemo(
    () => recommendRotationOrder(form.members.map(toMember)),
    [form.members]
  );

  const emailCoverage = form.members.filter((m) => EMAIL_RE.test(m.email)).length;
  const membersValid =
    form.members.length >= 2 &&
    form.members.every((m) => m.name.trim().length > 1 && EMAIL_RE.test(m.email));

  const displayOrder = form.useAiOrder
    ? aiOrder
    : form.members.map(toMember);

  function patchMember(i: number, patch: Partial<MemberDraft>) {
    setForm((f) => ({
      ...f,
      members: f.members.map((m, j) => (j === i ? { ...m, ...patch } : m)),
    }));
  }

  function addMember() {
    setForm((f) => ({
      ...f,
      members: [...f.members, { name: "", email: "", phone: "", lateCount: 0, cycles: 0 }],
    }));
  }

  function removeMember(i: number) {
    setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }));
  }

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else {
      const amount = Number(form.amount) || 0;
      const g: Group = {
        id: `group-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim() || (fr ? "Nouveau groupe de tontine" : "New tontine group"),
        descriptionEn: form.description.trim() || "New tontine group",
        currency: "FCFA",
        contributionAmount: amount,
        frequency: form.frequency,
        memberCount: form.members.length,
        currentCycleIndex: 1,
        createdAt: new Date().toISOString().slice(0, 10),
        emergencyFundBalance: 0,
        emergencyFundTarget: amount * 2,
        role: "Admin",
        cycleCollected: 0,
        cycleExpected: amount * form.members.length,
        openAlerts: 0,
      };
      addGroup(g);
      if (isBackendEnabled()) {
        const trust = (late: number, cycles: number) =>
          Math.max(50, Math.min(99, 92 - late * 7 + Math.min(6, cycles)));
        Promise.all(
          form.members.map((md, i) =>
            client.models.Member.create({
              id: `${g.id}-m${i}`,
              groupId: g.id,
              name: md.name.trim(),
              email: md.email.trim(),
              phone: md.phone.trim() || undefined,
              trustScore: trust(md.lateCount, md.cycles),
              lateCount: md.lateCount,
              cyclesCompleted: md.cycles,
              notifySms: false,
            }).catch(() => null)
          )
        ).then(() => {
          client.models.Cycle.create({
            id: `${g.id}-cycle-1`,
            groupId: g.id,
            cycleNumber: 1,
            startDate: new Date().toISOString().slice(0, 10),
            endDate: new Date().toISOString().slice(0, 10),
            status: "OPEN",
            totalExpected: amount * form.members.length,
            totalCollected: 0,
          }).catch(() => null);
        });
      }
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1800);
    }
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  const canNext =
    (step === 0 && form.name.trim().length > 1) ||
    (step === 1 && Number(form.amount) > 0) ||
    (step === 2 && membersValid) ||
    step === 3 ||
    step === 4;

  const inputCls =
    "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30";

  return (
    <div className="mx-auto max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Onboarding
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {fr ? "Créer un groupe" : "Create a group"}
        </h1>
      </motion.div>

      <div className="mt-8 flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                i <= step ? "bg-accent" : "bg-bg-subtle"
              }`}
            />
            <p
              className={`mt-2 text-[9px] uppercase tracking-wider ${
                i <= step ? "text-accent" : "text-muted"
              }`}
            >
              {s}
            </p>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-10 flex flex-col items-center rounded-2xl border border-ok/30 bg-ok/10 py-14 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok/20 text-ok">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <p className="mt-4 text-xl font-semibold">{fr ? "Groupe créé" : "Group created"}</p>
            <p className="mt-1 text-sm text-muted">
              {fr ? "Redirection vers le dashboard…" : "Redirecting to dashboard…"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35 }}
            className="panel-luminous mt-8 rounded-2xl p-6"
          >
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted">
                    {fr ? "Nom du groupe" : "Group name"}
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder={fr ? "ex. Tontine Quartier Liberté" : "e.g. Liberté District Tontine"}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted">
                    {fr ? "Description" : "Description"}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={3}
                    placeholder={fr ? "Association d'épargne solidaire…" : "Community savings group…"}
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted">
                    {fr ? "Montant (FCFA)" : "Amount (FCFA)"}
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted">
                    {fr ? "Fréquence" : "Frequency"}
                  </label>
                  <div className="mt-2 flex gap-2">
                    {(["MONTHLY", "WEEKLY"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, frequency: f }))
                        }
                        className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                          form.frequency === f
                            ? "border-accent/40 bg-accent-glow text-accent-hover"
                            : "border-border text-muted hover:text-foreground"
                        }`}
                      >
                        {f === "MONTHLY" ? (fr ? "Mensuel" : "Monthly") : fr ? "Hebdomadaire" : "Weekly"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {fr ? "Membres & contacts d'alerte" : "Members & alert contacts"}
                  </p>
                  <Badge tone={emailCoverage === form.members.length ? "ok" : "warn"}>
                    {emailCoverage}/{form.members.length} e-mail
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  {fr
                    ? "L'e-mail est requis : c'est lui qui reçoit les relances et la médiation. Les antécédents alimentent l'ordre IA."
                    : "Email is required: it receives nudges and mediation. History feeds the AI order."}
                </p>
                <ul className="space-y-3">
                  {form.members.map((m, i) => {
                    const emailOk = EMAIL_RE.test(m.email);
                    return (
                      <li key={i} className="rounded-xl border border-border bg-bg-subtle/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted">
                            #{i + 1} · trust {trustFor(m)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeMember(i)}
                            className="rounded-lg p-1 text-muted hover:text-danger"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 grid gap-2">
                          <input
                            value={m.name}
                            onChange={(e) => patchMember(i, { name: e.target.value })}
                            placeholder={fr ? "Nom complet" : "Full name"}
                            className={inputCls}
                          />
                          <input
                            value={m.email}
                            onChange={(e) => patchMember(i, { email: e.target.value })}
                            placeholder="email@exemple.sn"
                            inputMode="email"
                            className={cn(inputCls, m.email && !emailOk && "border-danger/50")}
                          />
                          {!emailOk && (
                            <p className="flex items-center gap-1.5 text-[11px] text-warn">
                              <MailWarning className="h-3 w-3" />
                              {fr ? "E-mail invalide — requis pour les alertes." : "Invalid email — required for alerts."}
                            </p>
                          )}
                          <input
                            value={m.phone}
                            onChange={(e) => patchMember(i, { phone: e.target.value })}
                            placeholder="+221 …"
                            inputMode="tel"
                            className={inputCls}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] text-muted">
                              <span className="mb-1 flex items-center gap-1">
                                <History className="h-3 w-3" />
                                {fr ? "Retards passés" : "Past lates"}
                              </span>
                              <select
                                value={m.lateCount}
                                onChange={(e) => patchMember(i, { lateCount: Number(e.target.value) })}
                                className={cn(inputCls, "py-2")}
                              >
                                {[0, 1, 2, 3, 4].map((n) => (
                                  <option key={n} value={n}>
                                    {n === 4 ? "4+" : n}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-[11px] text-muted">
                              <span className="mb-1 block">
                                {fr ? "Cycles participés" : "Cycles joined"}
                              </span>
                              <select
                                value={m.cycles}
                                onChange={(e) => patchMember(i, { cycles: Number(e.target.value) })}
                                className={cn(inputCls, "py-2")}
                              >
                                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                                  <option key={n} value={n}>
                                    {n === 0 ? (fr ? "Nouveau" : "New") : n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Button type="button" variant="secondary" onClick={addMember} className="w-full gap-1.5">
                  <Plus className="h-4 w-4" />
                  {fr ? "Ajouter un membre" : "Add a member"}
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-glow/50 p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-hover" />
                  <div>
                    <p className="text-sm font-medium">
                      {fr ? "Ordre de rotation recommandé" : "Recommended rotation order"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {fr
                        ? "Score de confiance − retards + ancienneté : profils fiables tôt, retards récurrents plus tard."
                        : "Trust score − lates + seniority: reliable profiles early, recurring lates later."}
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.useAiOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, useAiOrder: e.target.checked }))
                    }
                    className="accent-[var(--accent)]"
                  />
                  {fr ? "Appliquer l'ordre IA" : "Apply AI order"}
                </label>
                <ol className="space-y-2">
                  {displayOrder.map((m, i) => {
                    const late = m.lateCount ?? 0;
                    const risky = late >= 2 || m.trustScore < 80;
                    return (
                      <li
                        key={m.id}
                        className="rounded-xl border border-border px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            <span className="mr-2 font-mono text-xs text-accent-hover">
                              #{i + 1}
                            </span>
                            {m.name}
                          </span>
                          <Badge
                            tone={
                              m.trustScore >= 90 ? "ok" : m.trustScore >= 80 ? "accent" : "warn"
                            }
                          >
                            {m.trustScore}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          {fr ? "confiance" : "trust"} {m.trustScore} · {late} {fr ? (late > 1 ? "retards" : "retard") : late > 1 ? "lates" : "late"} ·{" "}
                          {m.cyclesCompleted ?? 0} {fr ? "cycles" : "cycles"} · {m.email || (fr ? "sans e-mail" : "no email")}
                        </p>
                        <p className={cn("mt-0.5 text-[11px]", risky ? "text-warn" : "text-ok")}>
                          {i < 2
                            ? fr ? "Profil fiable — placé tôt." : "Reliable profile — placed early."
                            : risky
                              ? fr ? "Risque de retard — placé plus tard." : "Late risk — placed later."
                              : fr ? "Profil stable — milieu d'ordre." : "Stable profile — mid order."}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted">{fr ? "Nom" : "Name"}</span>
                  <span className="font-medium">{form.name || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted">{fr ? "Cotisation" : "Contribution"}</span>
                  <span className="font-medium">
                    {Number(form.amount).toLocaleString(fr ? "fr-FR" : "en-US")} FCFA /{" "}
                    {form.frequency === "MONTHLY" ? (fr ? "mois" : "month") : fr ? "semaine" : "week"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted">{fr ? "Membres" : "Members"}</span>
                  <Badge tone="accent">{form.members.length}</Badge>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted">E-mail</span>
                  <Badge tone={emailCoverage === form.members.length ? "ok" : "warn"}>
                    {emailCoverage}/{form.members.length}
                  </Badge>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted">{fr ? "Rotation" : "Rotation"}</span>
                  <span className="font-medium">
                    {form.useAiOrder ? (fr ? "IA optimisée" : "AI optimized") : fr ? "Ordre manuel" : "Manual order"}
                  </span>
                </div>
                <p className="pt-2 text-xs leading-relaxed text-muted">
                  {fr ? "Pas de paiement réel — suivi et registre uniquement." : "No real payments — tracking and ledger only."}
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button
                variant="ghost"
                onClick={back}
                disabled={step === 0}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                {fr ? "Retour" : "Back"}
              </Button>
              <Button onClick={next} disabled={!canNext} className="gap-1.5">
                {step === 4 ? (fr ? "Créer le groupe" : "Create group") : fr ? "Continuer" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
