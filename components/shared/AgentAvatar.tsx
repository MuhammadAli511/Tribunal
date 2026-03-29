import { cn } from "@/lib/utils";
import type { AgentRole } from "@/src/types";

const AVATAR_CONFIG: Record<AgentRole, { emoji: string; gradient: string }> = {
  judge: {
    emoji: "⚖️",
    gradient: "from-[#5b8def] to-[#3b6fd4]",
  },
  prosecutor: {
    emoji: "🗡️",
    gradient: "from-[#e35d5d] to-[#c43c3c]",
  },
  defender: {
    emoji: "🛡️",
    gradient: "from-[#4ead6b] to-[#358a4f]",
  },
  "domain-expert": {
    emoji: "🔬",
    gradient: "from-[#e8a830] to-[#c48d1c]",
  },
  historian: {
    emoji: "📜",
    gradient: "from-[#b06ed4] to-[#8b4aad]",
  },
};

interface AgentAvatarProps {
  role: AgentRole;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AgentAvatar({ role, size = "md", className }: AgentAvatarProps) {
  const config = AVATAR_CONFIG[role];
  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-sm",
    lg: "h-12 w-12 text-2xl",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
        config.gradient,
        sizeClasses[size],
        className,
      )}
    >
      {config.emoji}
    </div>
  );
}

/** Get the hex color for an agent role (for inline styles). */
export function agentColor(role: AgentRole): string {
  const map: Record<AgentRole, string> = {
    judge: "#5b8def",
    prosecutor: "#e35d5d",
    defender: "#4ead6b",
    "domain-expert": "#e8a830",
    historian: "#b06ed4",
  };
  return map[role];
}
