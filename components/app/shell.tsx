"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  LayoutGrid,
  MessageSquareText,
  Users,
  BellRing,
  FileDown,
  Landmark,
  PlusCircle,
  Menu,
  X,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fetchUserAttributes,
  signOut,
} from "aws-amplify/auth";
import { sessionUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useGroups } from "@/lib/groups";
import { useLocale } from "@/lib/i18n";
import { isBackendEnabled } from "@/lib/backend";
import { LangToggle } from "@/components/i18n/language-gate";
import { BrandMark } from "@/components/landing/brand-mark";
import { AssistantChat } from "@/components/app/assistant-chat";
import { Avatar } from "@/components/ui/avatar";

type NavLink = { href: string; label: string; icon: typeof LayoutDashboard };

function NavLinksView({
  links,
  pathname,
  onNavigate,
}: {
  links: NavLink[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((l) => {
        const isActive = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "text-accent-hover"
                : "text-muted hover:bg-bg-subtle hover:text-foreground"
            )}
          >
            {isActive && (
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Aïssatou Diallo");
  const [userEmail, setUserEmail] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const { active } = useGroups();
  useEffect(() => {
    if (!isBackendEnabled()) return;
    let live = true;
    (async () => {
      try {
        // Robust resolver: getCurrentUser() throws during Amplify's
        // post-login token hydration, freezing the demo identity forever.
        await sessionUserId();
        const attrs = await fetchUserAttributes();
        if (!live) return;
        if (attrs.name) setUserName(attrs.name);
        if (attrs.email) setUserEmail(attrs.email);
      } catch {
        // keep demo identity
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    setMenuOpen(false);
    if (isBackendEnabled()) {
      try {
        await signOut();
      } catch {
        // fall through to login screen anyway
      }
    }
    router.push("/login");
  }

  const links: NavLink[] = [
    { href: "/dashboard", label: t("app.dashboard"), icon: LayoutDashboard },
    { href: "/groups", label: t("app.groups"), icon: LayoutGrid },
    { href: "/declare", label: t("app.declare"), icon: MessageSquareText },
    { href: "/members", label: t("app.members"), icon: Users },
    { href: "/alerts", label: t("app.alerts"), icon: BellRing },
    { href: "/fund", label: t("app.fund"), icon: Landmark },
    { href: "/export", label: t("app.export"), icon: FileDown },
    { href: "/group/new", label: t("app.newGroup"), icon: PlusCircle },
  ];



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
          <NavLinksView links={links} pathname={pathname} />
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
          <p className="hidden text-sm text-muted lg:block">
            {locale === "fr" ? "Connecté en tant que" : "Signed in as"} {userName}
            {active.role ? ` · ${active.role}` : ""}
          </p>
          <p className="text-sm font-semibold lg:hidden">TontinePilot</p>
          <div className="flex items-center gap-2">
            <LangToggle className="lg:hidden" />
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={t("nav.profile")}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Avatar name={userName} size="sm" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    role="menu"
                    className="shadow-elevate-medium absolute right-0 top-10 w-56 overflow-hidden rounded-2xl border border-border bg-bg-raised"
                  >
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                      <Avatar name={userName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{userName}</p>
                        {userEmail && (
                          <p className="truncate text-xs text-muted-dim">{userEmail}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-muted transition-colors hover:bg-bg-subtle hover:text-danger"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                <NavLinksView links={links} pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
