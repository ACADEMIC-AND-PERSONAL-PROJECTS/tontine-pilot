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

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
