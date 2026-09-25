"use client";

import { LocaleProvider } from "@/lib/i18n";
import { GroupsProvider } from "@/lib/groups";
import { LanguageGate } from "@/components/i18n/language-gate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <GroupsProvider>
        <LanguageGate />
        {children}
      </GroupsProvider>
    </LocaleProvider>
  );
}
