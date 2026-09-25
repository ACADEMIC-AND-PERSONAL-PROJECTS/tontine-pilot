"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function CodeInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function setAt(i: number, d: string) {
    const next = (value + "      ").slice(0, 6).split("");
    next[i] = d;
    const joined = next.join("").slice(0, 6);
    onChange(joined);
    if (joined.length === 6 && !joined.includes(" ") && onComplete) onComplete(joined);
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d.trim()}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            if (!ch) return;
            setAt(i, ch);
            refs.current[Math.min(i + 1, 5)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (digits[i]) {
                setAt(i, " ");
              } else {
                refs.current[Math.max(i - 1, 0)]?.focus();
              }
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const clean = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!clean) return;
            const joined = (clean + "      ").slice(0, 6);
            onChange(joined);
            refs.current[Math.min(clean.length, 5)]?.focus();
            if (clean.length === 6 && onComplete) onComplete(clean);
          }}
          className={cn(
            "h-12 w-full rounded-xl border border-border bg-background/60 text-center font-mono text-lg font-semibold outline-none transition-colors",
            "focus:border-accent/50 focus:ring-1 focus:ring-accent/30",
            d.trim() && "border-accent/40 text-accent-hover"
          )}
        />
      ))}
    </div>
  );
}
