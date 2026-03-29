import { cn } from "@/lib/utils";
import type { AgentRole } from "@/src/types";

const ROLE_CONFIG: Record<
  AgentRole,
  { label: string; className: string }
> = {
  judge: {
    label: "Judge",
    className: "bg-neutral-500/15 text-neutral-600 border-neutral-500/30 dark:text-neutral-300",
  },
  prosecutor: {
    label: "Prosecutor",
    className: "bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400",
  },
  defender: {
    label: "Defender",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  "domain-expert": {
    label: "Expert",
    className: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  },
  historian: {
    label: "Historian",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  },
};

interface AgentBadgeProps {
  role: AgentRole;
  className?: string;
}

export function AgentBadge({ role, className }: AgentBadgeProps) {
  const config = ROLE_CONFIG[role];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

/** Get the Tailwind ring/border color class for a given agent role. */
export function agentRingColor(role: AgentRole): string {
  const map: Record<AgentRole, string> = {
    judge: "ring-neutral-500/50",
    prosecutor: "ring-rose-500/50",
    defender: "ring-emerald-500/50",
    "domain-expert": "ring-sky-500/50",
    historian: "ring-amber-500/50",
  };
  return map[role];
}
