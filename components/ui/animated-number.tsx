"use client";

import CountUp from "react-countup";
import { cn } from "@/lib/utils";

export function AnimatedNumber({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      <CountUp end={value} duration={1.4} decimals={decimals} separator=" " />
      {suffix}
    </span>
  );
}
