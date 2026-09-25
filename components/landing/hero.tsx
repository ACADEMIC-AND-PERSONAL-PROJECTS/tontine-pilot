"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroTitle } from "@/components/landing/hero-title";
import { useLocale } from "@/lib/i18n";

const CommunityNet = dynamic(
  () =>
    import("@/components/three/community-net").then((m) => m.CommunityNet),
  { ssr: false }
);

export function Hero() {
  const { t } = useLocale();
  const [spot, setSpot] = useState({ x: "50%", y: "40%" });

  return (
    <section
      className="relative min-h-[100dvh] overflow-hidden pt-16"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setSpot({
          x: `${((e.clientX - rect.left) / rect.width) * 100}%`,
          y: `${((e.clientY - rect.top) / rect.height) * 100}%`,
        });
      }}
    >
      <div className="luminous-wash opacity-80" />
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-300"
        style={{
          background: `radial-gradient(720px circle at ${spot.x} ${spot.y}, rgba(139, 92, 246, 0.14), transparent 45%), radial-gradient(480px circle at ${spot.x} ${spot.y}, rgba(250, 204, 21, 0.05), transparent 40%)`,
        }}
      />
      <div className="grid-overlay" />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "orb-pulse 7s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-10 h-[380px] w-[380px] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(250,204,21,0.1) 0%, transparent 70%)",
          filter: "blur(70px)",
          animation: "orb-pulse 9s ease-in-out infinite 1.5s",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "orb-pulse 11s ease-in-out infinite 0.8s",
        }}
      />

      <div className="relative z-[1] mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 py-[clamp(4rem,12vh,8rem)] sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-accent-hover">
            <span className="gradient-text">TontinePilot</span>
          </p>
          <HeroTitle text={t("hero.title")} />
          <p className="mt-7 max-w-[42ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-relaxed text-muted">
            {t("hero.body")}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2" data-magnetic>
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how">
              <Button variant="secondary" size="lg">
                {t("hero.secondary")}
              </Button>
            </a>
          </div>
          <ul className="mt-14 flex flex-col gap-2.5 text-sm text-muted-dim sm:flex-row sm:flex-wrap sm:gap-x-10">
            <li>{t("hero.stat1")}</li>
            <li>{t("hero.stat2")}</li>
            <li>{t("hero.stat3")}</li>
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[520px] lg:max-w-none">
          <div
            className="absolute inset-[8%] rounded-full opacity-90"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(250,204,21,0.08) 35%, transparent 68%)",
              filter: "blur(36px)",
            }}
          />
          <span className="float-chip" style={{ top: "8%", left: "-2%" }}>
            cycle <strong>4</strong>
          </span>
          <span
            className="float-chip"
            style={{ top: "18%", right: "-4%", animationDelay: "1.6s" }}
          >
            → <strong>Cheikh</strong>
          </span>
          <span
            className="float-chip"
            style={{ bottom: "16%", left: "4%", animationDelay: "3.2s" }}
          >
            paid <strong>10/12</strong>
          </span>
          <div className="absolute inset-[6%] sm:inset-[4%]">
            <CommunityNet />
          </div>
        </div>
      </div>
    </section>
  );
}
