"use client";

import { motion } from "framer-motion";
import {
  fakeMembers,
  fakeContributions,
  recommendRotationOrder,
} from "@/lib/fake-data";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useGroups } from "@/lib/groups";
import { isBackendEnabled } from "@/lib/backend";
import { useRemoteMembers } from "@/lib/use-remote";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MembersPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const { active } = useGroups();
  const backendOn = isBackendEnabled();
  const { groups, synced } = useGroups();
  const noGroups = backendOn && synced && groups.length === 0;
  const { members: remoteMembers, loaded: membersLoaded } = useRemoteMembers(active.id);
  // Backend on: real rows even when empty. Off: demo dataset.
  const members = backendOn ? remoteMembers : fakeMembers;
  const showSkeleton = backendOn && !membersLoaded;
  const aiOrder = recommendRotationOrder(members);

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {active.name} · {active.memberCount} {fr ? "membres" : "members"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {fr ? "Membres & scores" : "Members & scores"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {fr
            ? "Ordre de rotation et score de confiance — base de la recommandation IA."
            : "Rotation order and trust scores — the basis of the AI recommendation."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="panel-luminous mt-6 rounded-2xl p-5"
      >
        <p className="text-xs uppercase tracking-wider text-muted">
          {fr ? "Rotation IA recommandée (prochain cycle)" : "Recommended AI rotation (next cycle)"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {aiOrder.slice(0, 6).map((m, i) => (
            <Badge key={m.id} tone={i < 3 ? "ok" : "accent"}>
              #{i + 1} {m.name.split(" ")[0]}
            </Badge>
          ))}
          {aiOrder.length > 6 && <Badge tone="muted">… +{aiOrder.length - 6}</Badge>}
        </div>
      </motion.div>

      {showSkeleton && (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}
      {!showSkeleton && !noGroups && members.length === 0 && (
        <p className="panel mt-8 rounded-2xl px-5 py-10 text-center text-sm text-muted">
          {fr
            ? "Aucun membre pour l'instant — ajoute-les depuis la création du groupe."
            : "No members yet — add them from group creation."}
        </p>
      )}

      {noGroups && (
        <div className="panel mt-8 rounded-2xl px-5 py-10 text-center">
          <p className="text-sm font-medium">{fr ? "Aucun groupe pour l'instant" : "No groups yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            {fr ? "Crée ton premier groupe pour voir tes membres ici." : "Create your first group to see members here."}
          </p>
          <Link href="/group/new" className="mt-4 inline-block">
            <Button size="sm">{fr ? "Créer un groupe" : "Create a group"}</Button>
          </Link>
        </div>
      )}
      {!noGroups && (
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {members.map((m, i) => {
          const contrib = fakeContributions.find((c) => c.memberId === m.id);
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              whileHover={{ y: -2 }}
              className="panel-luminous flex items-start gap-4 rounded-2xl p-4"
            >
              <Avatar name={m.name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold">{m.name}</h3>
                  <Badge
                    tone={
                      m.trustScore >= 95
                        ? "ok"
                        : m.trustScore >= 90
                          ? "accent"
                          : "warn"
                    }
                  >
                    Trust {m.trustScore}
                  </Badge>
                  {i === 3 && <Badge tone="accent">{fr ? "Bénéficiaire" : "Recipient"}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {m.phone} · {fr ? "depuis" : "since"} {formatDate(m.joinedAt, locale)}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted">
                    <span>{fr ? "Ponctualité" : "Punctuality"}</span>
                    <span>{m.trustScore}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
                      initial={{ width: 0 }}
                      animate={{ width: `${m.trustScore}%` }}
                      transition={{
                        delay: 0.2 + i * 0.04,
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </div>
                {contrib && (
                  <p className="mt-2 text-xs text-muted">
                    {fr ? "Cycle actuel : " : "Current cycle: "}{" "}
                    <span
                      className={
                        contrib.status === "CONFIRMED"
                          ? "text-ok"
                          : contrib.status === "LATE"
                            ? "text-danger"
                            : "text-warn"
                      }
                    >
                      {contrib.status === "CONFIRMED"
                        ? fr ? "Payé" : "Paid"
                        : contrib.status === "LATE"
                          ? fr ? "En retard" : "Late"
                          : fr ? "En attente" : "Pending"}
                    </span>
                    {contrib.method ? (
                      <span className="text-muted-dim"> · {contrib.method}</span>
                    ) : null}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted/50">#{i + 1}</span>
            </motion.div>
          );
        })}
      </div>
      )}
    </div>
  );
}
