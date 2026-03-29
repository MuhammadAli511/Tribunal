import { cn } from "@/lib/utils";
import type { AgentRole } from "@/src/types";

const ROLE_CONFIG: Record<AgentRole, { label: string; className: string }> = {
  judge: {
    label: "Judge",
    className: "bg-[#5b8def]/10 text-[#5b8def] border-[#5b8def]/20",
  },
  prosecutor: {
    label: "Prosecutor",
    className: "bg-[#e35d5d]/10 text-[#e35d5d] border-[#e35d5d]/20",
  },
  defender: {
    label: "Defender",
    className: "bg-[#4ead6b]/10 text-[#4ead6b] border-[#4ead6b]/20",
  },
  "domain-expert": {
    label: "Expert",
    className: "bg-[#e8a830]/10 text-[#e8a830] border-[#e8a830]/20",
  },
  historian: {
    label: "Historian",
    className: "bg-[#b06ed4]/10 text-[#b06ed4] border-[#b06ed4]/20",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

export function agentRingColor(role: AgentRole): string {
  const map: Record<AgentRole, string> = {
    judge: "ring-[#5b8def]/40",
    prosecutor: "ring-[#e35d5d]/40",
    defender: "ring-[#4ead6b]/40",
    "domain-expert": "ring-[#e8a830]/40",
    historian: "ring-[#b06ed4]/40",
  };
  return map[role];
}
