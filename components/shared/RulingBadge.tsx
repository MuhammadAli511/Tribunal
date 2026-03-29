import { cn } from "@/lib/utils";
import type { Ruling } from "@/src/types";

const RULING_CONFIG: Record<
  Ruling,
  { label: string; className: string }
> = {
  proceed: {
    label: "Proceed",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  conditional: {
    label: "Conditional",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  },
  "do-not-proceed": {
    label: "Do Not Proceed",
    className: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
