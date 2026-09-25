import { cn } from "@/lib/utils";

const styles = {
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  muted: "bg-bg-subtle text-muted border-border",
  accent: "bg-accent-glow text-accent-hover border-accent/30",
} as const;

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof styles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[8px] border px-2 py-0.5 text-xs font-medium tracking-wide",
        styles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
