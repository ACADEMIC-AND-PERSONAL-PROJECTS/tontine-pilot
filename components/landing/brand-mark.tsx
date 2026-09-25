import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = 32,
  className,
  showWordmark = true,
  priority = false,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo.jpeg"
        alt="TontinePilot"
        width={size}
        height={size}
        className="rounded-[9px] shadow-[0_0_0_1px_rgba(250,204,21,0.15),0_4px_16px_rgba(139,92,246,0.25)]"
        priority={priority}
      />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          TontinePilot
        </span>
      )}
    </span>
  );
}
