"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  LayoutGrid,
  MessageSquareText,
  Users,
  BellRing,
  FileDown,
  PlusCircle,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useGroups } from "@/lib/groups";
import { useLocale } from "@/lib/i18n";
import { LangToggle } from "@/components/i18n/language-gate";
import { BrandMark } from "@/components/landing/brand-mark";
import { AssistantChat } from "@/components/app/assistant-chat";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  const { active } = useGroups();
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: t("app.dashboard"), icon: LayoutDashboard },
    { href: "/groups", label: t("app.groups"), icon: LayoutGrid },
    { href: "/declare", label: t("app.declare"), icon: MessageSquareText },
    { href: "/members", label: t("app.members"), icon: Users },
    { href: "/alerts", label: t("app.alerts"), icon: BellRing },
    { href: "/export", label: t("app.export"), icon: FileDown },
    { href: "/group/new", label: t("app.newGroup"), icon: PlusCircle },
  ];

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-col gap-0.5">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-accent-hover"
                  : "text-muted hover:bg-bg-subtle hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-[10px] bg-accent-glow border border-accent/25"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <l.icon className="relative z-10 h-4 w-4 shrink-0" strokeWidth={1.7} />
              <span className="relative z-10">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-bg-raised lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Link href="/" className="flex items-center">
            <BrandMark size={28} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
          <p className="mb-2 truncate px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-dim">
            {active.name}
          </p>
          <NavLinks />
        </div>
        <div className="space-y-2 border-t border-border p-3">
          <LangToggle className="w-full justify-center" />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-muted transition-colors hover:bg-bg-subtle hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nav.back")}
          </Link>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-[8px] p-2 text-muted hover:bg-bg-subtle hover:text-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-muted lg:block">{t("nav.admin")}</p>
          <p className="text-sm font-semibold lg:hidden">TontinePilot</p>
          <div className="flex items-center gap-2">
            <LangToggle className="lg:hidden" />
            <div className="h-8 w-8 rounded-full bg-accent-glow" />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>

      <AssistantChat />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-bg-raised lg:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <span className="font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[8px] p-2 text-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
