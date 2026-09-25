"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/landing/brand-mark";
import { useLocale } from "@/lib/i18n";

export function LandingCTA() {
  const { t } = useLocale();

  return (
    <section className="relative border-t border-border py-[clamp(5rem,12vh,10rem)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="shadow-elevate-high relative overflow-hidden rounded-3xl border border-border bg-bg-overlay px-8 py-16 sm:px-14 sm:py-20"
        >
          <div className="luminous-wash" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 90% 40%, rgba(139,92,246,0.22), transparent), radial-gradient(ellipse 40% 50% at 10% 80%, rgba(250,204,21,0.08), transparent)",
            }}
          />
          <div className="relative max-w-xl">
            <h2 className="text-[clamp(1.85rem,3.5vw,2.75rem)] font-medium tracking-[-0.02em]">
              {t("cta.title")}
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              {t("cta.body")}
            </p>
            <Link href="/dashboard" className="mt-10 inline-block">
              <Button size="lg" className="gap-2">
                {t("cta.btn")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const { t } = useLocale();

  const product = [
    { href: "#features", label: t("nav.features") },
    { href: "#film", label: t("nav.film") },
    { href: "#demo", label: t("nav.demo") },
    { href: "#how", label: t("nav.how") },
  ];

  const app = [
    { href: "/dashboard", label: t("app.dashboard") },
    { href: "/declare", label: t("app.declare") },
    { href: "/alerts", label: t("app.alerts") },
    { href: "/export", label: t("app.export") },
  ];

  return (
    <footer className="relative border-t border-border">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(167,139,250,0.45), rgba(250,204,21,0.35), transparent)",
        }}
      />
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <BrandMark size={40} />
            <p className="mt-5 text-sm leading-relaxed text-muted">
              {t("footer.blurb")}
            </p>
            <p className="mt-4 text-xs text-muted-dim">{t("footer.note")}</p>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dim">
              {t("footer.product")}
            </p>
            <ul className="space-y-2.5">
              {product.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dim">
              {t("footer.app")}
            </p>
            <ul className="space-y-2.5">
              {app.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dim">
              {t("footer.hackathon")}
            </p>
            <p className="text-sm leading-relaxed text-muted">{t("footer.tags")}</p>
            <Link href="/dashboard" className="mt-5 inline-block">
              <Button size="sm" className="gap-1.5">
                {t("nav.open")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-8 text-xs text-muted-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TontinePilot</p>
          <p className="font-mono text-[11px] tracking-wide text-gold/70">
            cycle · trust · ledger
          </p>
        </div>
      </div>
    </footer>
  );
}
