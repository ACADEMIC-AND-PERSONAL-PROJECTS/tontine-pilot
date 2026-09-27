import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFCFA(amount: number, locale: string = "fr") {
  return (
    new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(amount) +
    " FCFA"
  );
}

export type Currency = "FCFA" | "USD";

/** Locale-aware money formatting. FCFA keeps the historic rendering;
 *  USD uses standard currency formatting without decimals. */
export function formatMoney(
  amount: number,
  currency?: string | null,
  locale: string = "fr"
): string {
  if (currency === "USD") {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return formatFCFA(amount, locale);
}

export function formatDate(date: string, locale: string = "fr") {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** First-cycle window for a group: cycle 1 IS the first savings period, so
 *  it spans a real duration from the group start (weekly: +7 days, monthly:
 *  same day next month, clamped to month length) — never start=end=today. */
export function cycleWindow(
  startIso: string,
  frequency?: string | null
): { startDate: string; endDate: string } {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(startIso ?? "");
  const start = valid ? (startIso as string) : new Date().toISOString().slice(0, 10);
  const [y, m, d] = start.split("-").map(Number);
  let end: Date;
  if (frequency === "WEEKLY") {
    end = new Date(Date.UTC(y, m - 1, d + 7));
  } else {
    const ny = m === 12 ? y + 1 : y;
    const nm = m % 12;
    const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    end = new Date(Date.UTC(ny, nm, Math.min(d, lastDay)));
  }
  return { startDate: start, endDate: end.toISOString().slice(0, 10) };
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
