import { cn } from "@/lib/utils";
import type { Ruling } from "@/src/types";

const RULING_CONFIG: Record<Ruling, { label: string; className: string }> = {
  proceed: {
    label: "Proceed",
    className: "bg-[#4ead6b]/10 text-[#4ead6b] border-[#4ead6b]/20",
  },
  conditional: {
    label: "Conditional",
    className: "bg-[#e8a830]/10 text-[#e8a830] border-[#e8a830]/20",
  },
  "do-not-proceed": {
    label: "Do Not Proceed",
    className: "bg-[#e35d5d]/10 text-[#e35d5d] border-[#e35d5d]/20",
  },
};

interface RulingBadgeProps {
  ruling: Ruling;
  className?: string;
}

export function RulingBadge({ ruling, className }: RulingBadgeProps) {
  const config = RULING_CONFIG[ruling];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-center rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
