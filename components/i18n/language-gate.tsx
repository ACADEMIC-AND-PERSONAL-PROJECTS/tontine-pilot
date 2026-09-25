"use client";

import { motion } from "framer-motion";
import { useLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageGate() {
  const { ready, needsChoice, confirmLocale, t } = useLocale();

  if (!ready || !needsChoice) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-5"
    >
      <div className="grid-overlay" />
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[1] w-full max-w-md"
      >
        <p className="text-sm font-semibold tracking-tight">
          <span className="gradient-text">TontinePilot</span>
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("lang.choose")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("lang.sub")}</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {(
            [
              { code: "en" as Locale, label: "English", hint: "Hackathon / judges" },
              { code: "fr" as Locale, label: "Français", hint: "Sénégal / communauté" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => confirmLocale(opt.code)}
              className={cn(
                "rounded-2xl border border-border bg-bg-raised p-5 text-left transition-all duration-200",
                "hover:border-accent/50 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]",
                "active:scale-[0.98]"
              )}
            >
              <span className="block text-lg font-semibold tracking-tight group-hover:text-accent-hover">
                {opt.label}
              </span>
              <span className="mt-1 block text-xs text-muted-dim">{opt.hint}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex rounded-[10px] border border-border bg-bg-raised p-0.5 text-xs font-medium",
        className
      )}
    >
      {(["en", "fr"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-[8px] px-2.5 py-1.5 uppercase tracking-wide transition-colors",
            locale === l
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
