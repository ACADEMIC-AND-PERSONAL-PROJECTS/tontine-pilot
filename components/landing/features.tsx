"use client";

import { motion } from "framer-motion";
import {
  MessageSquareText,
  LayoutDashboard,
  FileDown,
  Check,
  ImageIcon,
  Landmark,
  Volume2,
  ArrowLeftRight,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { fakeGroup } from "@/lib/fake-data";

const ease = [0.16, 1, 0.3, 1] as const;

function ReminderGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7.5V12l3.2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeclareMock({ locale }: { locale: string }) {
  const lines =
    locale === "fr"
      ? [
          { who: "Moussa", text: "J'ai payé 20000 pour Cheikh" },
          { who: "IA", text: "20 000 FCFA · Cheikh · confirmé", ok: true },
        ]
      : [
          { who: "Moussa", text: "I paid 20000 for Cheikh" },
          { who: "AI", text: "20,000 FCFA · Cheikh · confirmed", ok: true },
        ];

  return (
    <div className="panel-luminous relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="relative space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-dim">
          <MessageSquareText className="h-3.5 w-3.5 text-accent-hover" />
          Bedrock NLU
        </div>
        {lines.map((l) => (
          <div
            key={l.text}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              l.ok
                ? "border-ok/30 bg-ok-soft text-ok"
                : "border-border bg-bg-overlay text-foreground"
            )}
          >
            <span className="mb-1 block text-[10px] uppercase tracking-wider opacity-70">
              {l.who}
            </span>
            <span className="flex items-center gap-2">
              {l.ok && <Check className="h-3.5 w-3.5 shrink-0" />}
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OcrMock({ locale }: { locale: string }) {
  return (
    <div className="shadow-elevate-medium overflow-hidden rounded-2xl border border-border bg-bg-raised">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 text-xs text-muted-dim">
        <ImageIcon className="h-3.5 w-3.5 text-accent-hover" />
        Bedrock Vision · Wave
      </div>
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="flex items-center justify-center border-b border-border bg-bg-subtle/40 p-6 sm:border-b-0 sm:border-r">
          <div className="w-full max-w-[180px] rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-dim" />
            <p className="mt-2 text-[11px] text-muted">
              {locale === "fr" ? "Capture reçue" : "Receipt uploaded"}
            </p>
          </div>
        </div>
        <div className="space-y-3 p-5">
          {[
            ["amount", "20 000 FCFA"],
            ["txn", "WV-991204"],
            ["date", "24 Sep 2024"],
            ["status", locale === "fr" ? "Succès" : "Success"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-muted-dim">{k}</span>
              <span className="font-mono font-medium">{v}</span>
            </div>
          ))}
          <Badge tone="ok">93% confidence</Badge>
        </div>
      </div>
    </div>
  );
}

function MediatorMock({ locale }: { locale: string }) {
  return (
    <div className="space-y-3">
      <div className="shadow-elevate-medium rounded-2xl border border-warn/25 bg-warn-soft p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-warn/25 bg-background/40 text-warn">
            <ReminderGlyph className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-warn">
            Reminder
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {locale === "fr"
            ? "Modou, la date limite approche (30 sept). Merci de régulariser."
            : "Modou, the deadline is near (Sep 30). Please settle soon."}
        </p>
      </div>
      <div className="shadow-elevate-medium rounded-2xl border border-accent/25 bg-accent-glow/40 p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-background/40 text-accent-hover">
            <ArrowLeftRight className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-accent-hover">
            {locale === "fr" ? "Échange de tour" : "Swap proposal"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {locale === "fr"
            ? "Ibrahima ↔ Fatou : échange proposé pour sécuriser le cycle."
            : "Ibrahima ↔ Fatou: proposed swap to keep the cycle safe."}
        </p>
      </div>
    </div>
  );
}

function FundMock({ locale }: { locale: string }) {
  const pct = Math.round(
    (fakeGroup.emergencyFundBalance / fakeGroup.emergencyFundTarget) * 100
  );
  return (
    <div className="panel-luminous rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs text-muted-dim">
        <Landmark className="h-3.5 w-3.5 text-accent-hover" />
        Tontine Flex
      </div>
      <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
        {fakeGroup.emergencyFundBalance.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}{" "}
        <span className="text-base text-muted">FCFA</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        {locale === "fr"
          ? "Réserve prête à couvrir un retard critique."
          : "Reserve ready to cover a critical late payment."}
      </p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-dim">
        {pct}% · {locale === "fr" ? "cible" : "target"}{" "}
        {fakeGroup.emergencyFundTarget.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")} FCFA
      </p>
    </div>
  );
}

function FeatureBand({
  index,
  title,
  body,
  reverse,
  visual,
}: {
  index: string;
  title: string;
  body: string;
  reverse?: boolean;
  visual: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease }}
      className={cn(
        "grid items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20",
        reverse && "lg:[&>*:first-child]:order-2"
      )}
    >
      <div className="max-w-md">
        <span className="font-mono text-sm font-medium text-accent-hover">
          {index}
        </span>
        <h3 className="mt-4 text-[clamp(1.5rem,2.5vw,2rem)] font-medium tracking-[-0.02em] text-foreground">
          {title}
        </h3>
        <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">
          {body}
        </p>
      </div>
      <div>{visual}</div>
    </motion.div>
  );
}

export function Features() {
  const { t, locale } = useLocale();

  const secondary = [
    {
      icon: Volume2,
      title: t("features.f5.t"),
      body: t("features.f5.b"),
    },
    {
      icon: ArrowLeftRight,
      title: t("features.f6.t"),
      body: t("features.f6.b"),
    },
    {
      icon: LayoutDashboard,
      title: t("features.f7.t"),
      body: t("features.f7.b"),
    },
    {
      icon: FileDown,
      title: t("features.f8.t"),
      body: t("features.f8.b"),
    },
  ];

  return (
    <section id="features" className="relative border-t border-border">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-[clamp(5rem,12vh,9rem)] sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-2xl"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent-hover">
            {locale === "fr" ? "Capacités" : "Capabilities"}
          </p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.03em] leading-[1.1]">
            {t("features.title")}
          </h2>
          <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">
            {locale === "fr"
              ? "OCR, médiation, caisse de secours, audio — chaque levier pensé pour un admin de tontine réel."
              : "OCR, mediation, emergency fund, audio — each lever built for a real tontine admin."}
          </p>
        </motion.div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[clamp(4.5rem,10vh,7.5rem)] px-6 py-[clamp(4rem,9vh,7rem)] sm:px-8">
        <FeatureBand
          index="01"
          title={t("features.f1.t")}
          body={t("features.f1.b")}
          visual={<DeclareMock locale={locale} />}
        />
        <FeatureBand
          index="02"
          title={t("features.f2.t")}
          body={t("features.f2.b")}
          reverse
          visual={<OcrMock locale={locale} />}
        />
        <FeatureBand
          index="03"
          title={t("features.f3.t")}
          body={t("features.f3.b")}
          visual={<MediatorMock locale={locale} />}
        />
        <FeatureBand
          index="04"
          title={t("features.f4.t")}
          body={t("features.f4.b")}
          reverse
          visual={<FundMock locale={locale} />}
        />
      </div>

      <div className="border-t border-border bg-bg-raised/30">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-[clamp(4rem,9vh,7rem)] sm:px-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-10 text-xs font-medium uppercase tracking-[0.2em] text-muted-dim"
          >
            {locale === "fr" ? "Aussi inclus" : "Also included"}
          </motion.p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondary.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06, duration: 0.55, ease }}
                whileHover={{ y: -4 }}
                className="group panel-luminous rounded-2xl p-6 transition-colors hover:border-accent/35"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-bg-overlay text-accent-hover transition-colors group-hover:border-accent/40 group-hover:bg-accent-glow">
                  <f.icon className="h-4 w-4" strokeWidth={1.7} />
                </div>
                <h3 className="text-base font-medium tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12, duration: 0.6, ease }}
            className="shadow-elevate-medium mt-4 overflow-hidden rounded-2xl border border-border bg-bg-raised"
          >
            <div className="grid sm:grid-cols-[1fr_1.1fr]">
              <div className="border-b border-border p-7 sm:border-b-0 sm:border-r sm:p-8">
                <p className="text-xs uppercase tracking-wider text-muted-dim">
                  {locale === "fr" ? "Scores de confiance" : "Trust scores"}
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight">
                  {locale === "fr"
                    ? "Visibles. Partageables. Actionnables."
                    : "Visible. Shareable. Actionable."}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {locale === "fr"
                    ? "La ponctualité guide la rotation IA et les propositions du médiateur."
                    : "Punctuality drives AI rotation and mediator proposals."}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-4 p-7 sm:p-8">
                {[
                  { name: "Khadija Touré", score: 97 },
                  { name: "Fatou Mbaye", score: 96 },
                  { name: "Ibrahima Sow", score: 72 },
                ].map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="truncate text-muted">{m.name}</span>
                        <span className="font-mono text-accent-hover">
                          {m.score}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${m.score}%` }}
                          viewport={{ once: true }}
                          transition={{
                            delay: 0.15 + i * 0.08,
                            duration: 0.75,
                            ease,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
