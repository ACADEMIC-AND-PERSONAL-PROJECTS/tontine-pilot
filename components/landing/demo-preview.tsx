"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { currentCycle, fakeContributions, fakeGroup, contributionText } from "@/lib/fake-data";
import { useLocale } from "@/lib/i18n";

const paid = fakeContributions.filter((c) => c.status === "CONFIRMED").length;
const late = fakeContributions.filter((c) => c.status === "LATE").length;
const pending = fakeContributions.filter((c) => c.status === "PENDING").length;
const pct = Math.round(
  (currentCycle.totalCollected / currentCycle.totalExpected) * 100
);

export function DemoPreview() {
  const { t, locale } = useLocale();
  const fr = locale === "fr";

  return (
    <section
      id="demo"
      className="relative border-t border-border bg-bg-raised/40 py-[clamp(5rem,12vh,10rem)]"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 max-w-xl"
        >
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]">
            {t("demo.title")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            {t("demo.body").includes("Liberté")
              ? t("demo.body")
              : `Demo data for “${fakeGroup.name}” — 12 members, 20,000 FCFA / month.`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="shadow-elevate-high overflow-hidden rounded-2xl border border-border bg-bg-raised"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
            <div>
              <p className="text-xs text-muted-dim">{t("demo.cycle")}</p>
              <p className="mt-1 text-xl font-medium tracking-tight">
                Cycle {currentCycle.cycleNumber} · {currentCycle.recipientName}
              </p>
            </div>
            <Badge tone="accent">{t("demo.open")}</Badge>
          </div>

          <div className="grid border-b border-border sm:grid-cols-4">
            {[
              { label: t("demo.collected"), value: currentCycle.totalCollected, suffix: "" },
              { label: t("demo.expected"), value: currentCycle.totalExpected, suffix: "" },
              {
                label: t("demo.paid"),
                value: paid,
                suffix: ` / ${fakeContributions.length}`,
              },
              { label: t("demo.progress"), value: pct, suffix: "%" },
            ].map((s) => (
              <div
                key={s.label}
                className="border-b border-border px-6 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:border-border sm:last:border-r-0 sm:px-8"
              >
                <p className="text-xs text-muted-dim">{s.label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                </p>
              </div>
            ))}
          </div>

          <div className="relative h-1 w-full bg-bg-subtle">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent via-fuchsia to-cyan"
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            />
          </div>

          <div className="divide-y divide-border">
            {fakeContributions.slice(0, 6).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.04 * i, duration: 0.4 }}
                className="flex items-center justify-between gap-4 px-6 py-3.5 sm:px-8"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.memberName} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{c.memberName}</p>
                    <p className="max-w-[240px] truncate text-xs text-muted-dim sm:max-w-none">
                      {contributionText(c, locale) || "—"}
                    </p>
                  </div>
                </div>
                <Badge
                  tone={
                    c.status === "CONFIRMED"
                      ? "ok"
                      : c.status === "LATE"
                        ? "danger"
                        : "warn"
                  }
                >
                  {c.status === "CONFIRMED"
                    ? "OK"
                    : c.status === "LATE"
                      ? fr ? "En retard" : "Late"
                      : fr ? "En attente" : "Pending"}
                </Badge>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-5 border-t border-border px-6 py-4 text-sm text-muted sm:px-8">
            <span>
              <span className="font-medium text-ok">{paid}</span> OK
            </span>
            <span>
              <span className="font-medium text-warn">{pending}</span> {fr ? "en attente" : "pending"}
            </span>
            <span>
              <span className="font-medium text-danger">{late}</span> {fr ? "en retard" : "late"}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
