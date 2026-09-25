"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/landing/brand-mark";
import { LangToggle } from "@/components/i18n/language-gate";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isBackendEnabled } from "@/lib/backend";
import { getCurrentUser } from "aws-amplify/auth";

export function LandingNav() {
  const { t } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isBackendEnabled()) return;
    getCurrentUser().then(
      () => setAuthed(true),
      () => setAuthed(false)
    );
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6 sm:px-8">
        <Link href="/" className="flex items-center">
          <BrandMark size={32} priority />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            {t("nav.features")}
          </a>
          <a href="#film" className="transition-colors hover:text-foreground">
            {t("nav.film")}
          </a>
          <a href="#demo" className="transition-colors hover:text-foreground">
            {t("nav.demo")}
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            {t("nav.how")}
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <LangToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              {t("nav.login")}
            </Button>
          </Link>
          <Link href={authed ? "/dashboard" : "/login"}>
            <Button size="sm" className="gap-1.5">
              {t("nav.open")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
