"use client";

import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent-glow font-semibold text-accent-hover",
        dims[size],
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
