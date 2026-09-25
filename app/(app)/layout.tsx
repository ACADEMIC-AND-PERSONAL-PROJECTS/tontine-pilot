"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import { AppShell } from "@/components/app/shell";
import { isBackendEnabled } from "@/lib/backend";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "in" | "demo">(() =>
    isBackendEnabled() ? "checking" : "demo"
  );

  useEffect(() => {
    if (state !== "checking") return;
    getCurrentUser().then(
      () => setState("in"),
      () => router.replace("/login")
    );
  }, [router, state]);

  if (state === "checking") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="luminous-wash opacity-80" />
        <div className="grid-overlay" />
        <div className="relative z-[1] h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
