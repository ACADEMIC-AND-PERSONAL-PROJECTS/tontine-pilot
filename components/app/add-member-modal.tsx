"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { addMemberToGroup, splitCycles, type DuesCycle } from "@/lib/catchup";
import { formatMoney } from "@/lib/utils";

export type AddedMember = { memberId: string; name: string; totalDue: number };

/** Add a member to an ongoing group with full catch-up (missed cycles become
 *  LATE dues + alerts, open cycles become PENDING). Used by the members page
 *  and by the declare flow when a payer is unknown. */
export function AddMemberModal({
  groupId,
  groupName,
  ownerId,
  contributionAmount,
  currency,
  cycles,
  initialName = "",
  open,
  onClose,
  onAdded,
}: {
  groupId: string;
  groupName: string;
  ownerId?: string;
  contributionAmount: number;
  currency?: string | null;
  cycles: DuesCycle[];
  initialName?: string;
  open: boolean;
  onClose: () => void;
  onAdded: (m: AddedMember) => void;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const plan = useMemo(() => splitCycles(cycles, today), [cycles, today]);
  const totalDue = (plan.missed.length + plan.open.length) * contributionAmount;

  async function submit() {
    if (!name.trim() || !email.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await addMemberToGroup({
        groupId,
        ownerId,
        name,
        email,
        phone,
        contributionAmount,
        cycles,
        todayIso: today,
        locale,
      });
      onAdded({ memberId: r.memberId, name: name.trim(), totalDue: r.totalDue });
      onClose();
    } catch (e) {
      setError(
        fr
          ? `Ajout impossible : ${(e as Error)?.message ?? "erreur"}.`
          : `Could not add member: ${(e as Error)?.message ?? "error"}.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="panel-luminous w-full max-w-md rounded-2xl p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {fr ? `Ajouter à ${groupName}` : `Add to ${groupName}`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {fr
                ? "Rattrapage complet : les cycles passés deviennent des dus en retard."
                : "Full catch-up: past cycles become late dues."}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted">
                  {fr ? "Nom" : "Name"}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={fr ? "Ex. Awa Ndiaye" : "E.g. Awa Ndiaye"}
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="awa@example.com"
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted">
                  {fr ? "Téléphone (optionnel)" : "Phone (optional)"}
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 …"
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40"
                />
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border px-2 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-muted">
                  {fr ? "En retard" : "Late"}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {plan.missed.length}
                </dd>
              </div>
              <div className="rounded-xl border border-border px-2 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-muted">
                  {fr ? "En cours" : "Open"}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {plan.open.length}
                </dd>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 px-2 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-muted">
                  {fr ? "Total dû" : "Total due"}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {formatMoney(totalDue, currency ?? "FCFA", locale)}
                </dd>
              </div>
            </dl>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                {fr ? "Annuler" : "Cancel"}
              </Button>
              <Button
                onClick={submit}
                disabled={!name.trim() || !email.trim() || saving}
                className="flex-1"
              >
                {saving
                  ? fr
                    ? "Ajout…"
                    : "Adding…"
                  : fr
                    ? "Ajouter + rattrapage"
                    : "Add + catch-up"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
