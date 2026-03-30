"use client";

import { cn } from "@/lib/utils";
import type { AgentRole } from "@/src/types";

const AVATAR_CONFIG: Record<
  AgentRole,
  {
    headGradient: [string, string];
    bodyGradient: [string, string];
    color: string;
    detail: "gavel" | "glasses" | "hood" | "shield" | "sharp";
  }
> = {
  judge: {
    headGradient: ["#5b8def", "#3b6fd4"],
    bodyGradient: ["#3b6fd4", "#2a54a8"],
    color: "#5b8def",
    detail: "gavel",
  },
  prosecutor: {
    headGradient: ["#e35d5d", "#c43c3c"],
    bodyGradient: ["#c43c3c", "#a32e2e"],
    color: "#e35d5d",
    detail: "sharp",
  },
  defender: {
    headGradient: ["#4ead6b", "#358a4f"],
    bodyGradient: ["#358a4f", "#2a7040"],
    color: "#4ead6b",
    detail: "shield",
  },
  "domain-expert": {
    headGradient: ["#e8a830", "#c48d1c"],
    bodyGradient: ["#c48d1c", "#a67616"],
    color: "#e8a830",
    detail: "glasses",
  },
  historian: {
    headGradient: ["#b06ed4", "#8b4aad"],
    bodyGradient: ["#8b4aad", "#6f3a8a"],
    color: "#b06ed4",
    detail: "hood",
  },
};

type AvatarState = "idle" | "speaking" | "reacting";

interface AgentAvatarProps {
  role: AgentRole;
  size?: "sm" | "md" | "lg";
  state?: AvatarState;
  className?: string;
}

const SIZE_MAP = { sm: 32, md: 48, lg: 72 };

export function AgentAvatar({
  role,
  size = "md",
  state = "idle",
  className,
}: AgentAvatarProps) {
  const cfg = AVATAR_CONFIG[role];
  const px = SIZE_MAP[size];
  const headId = `head-${role}`;
  const bodyId = `body-${role}`;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{
        width: px,
        height: px,
        filter: `drop-shadow(0 0 ${state === "speaking" ? 12 : 6}px ${cfg.color}${state === "speaking" ? "60" : "30"})`,
        transition: "filter 0.3s ease",
      }}
    >
      <svg
        viewBox="0 0 48 56"
        width={px}
        height={px}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={headId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cfg.headGradient[0]} />
            <stop offset="100%" stopColor={cfg.headGradient[1]} />
          </linearGradient>
          <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cfg.bodyGradient[0]} />
            <stop offset="100%" stopColor={cfg.bodyGradient[1]} />
          </linearGradient>
        </defs>

        {/* Role-specific background detail */}
        {cfg.detail === "shield" && (
          <path
            d="M24 8 L38 16 L38 30 Q38 42 24 46 Q10 42 10 30 L10 16 Z"
            fill={`${cfg.color}10`}
            stroke={`${cfg.color}25`}
            strokeWidth="0.5"
          />
        )}

        {/* Body / Robe */}
        <g className="animate-avatar-breathe">
          <path
            d={
              cfg.detail === "sharp"
                ? "M12 30 L24 28 L36 30 L38 48 L32 50 L24 49 L16 50 L10 48 Z"
                : "M14 30 L24 28 L34 30 L36 48 L30 50 L24 49 L18 50 L12 48 Z"
            }
            fill={`url(#${bodyId})`}
          />
          {/* Collar */}
          <path
            d="M20 28.5 L24 27.5 L28 28.5 L27 31 L24 32 L21 31 Z"
            fill="#ede9e120"
            stroke="#ede9e130"
            strokeWidth="0.3"
          />
        </g>

        {/* Head */}
        <g className={state === "speaking" ? "animate-avatar-head-bob" : ""}>
          {/* Hood for historian */}
          {cfg.detail === "hood" && (
            <path
              d="M14 14 Q24 6 34 14"
              fill="none"
              stroke={`${cfg.color}50`}
              strokeWidth="1"
            />
          )}

          {/* Head circle */}
          <circle cx="24" cy="17" r="10" fill={`url(#${headId})`} />

          {/* Eyes */}
          <g className={cn(
            state === "idle" && "animate-avatar-blink",
            state === "reacting" && "animate-avatar-react",
          )}>
            {cfg.detail === "glasses" ? (
              <>
                <circle cx="20" cy="16" r="3.5" fill="none" stroke="#ede9e1" strokeWidth="0.8" />
                <circle cx="28" cy="16" r="3.5" fill="none" stroke="#ede9e1" strokeWidth="0.8" />
                <line x1="23.5" y1="16" x2="24.5" y2="16" stroke="#ede9e1" strokeWidth="0.5" />
                <circle cx="20" cy="16" r="1.2" fill="#ede9e1" />
                <circle cx="28" cy="16" r="1.2" fill="#ede9e1" />
              </>
            ) : (
              <>
                <circle cx="20" cy="16" r="1.5" fill="#ede9e1" />
                <circle cx="28" cy="16" r="1.5" fill="#ede9e1" />
              </>
            )}
          </g>

          {/* Mouth */}
          <path
            d={state === "speaking" ? "M21,21 Q24,24 27,21" : "M21,21 Q24,22 27,21"}
            stroke="#ede9e1"
            strokeWidth="0.8"
            fill="none"
            className={state === "speaking" ? "animate-avatar-speak" : ""}
          />
        </g>

        {/* Gavel detail for judge */}
        {cfg.detail === "gavel" && (
          <g transform="translate(34,38) rotate(-20)">
            <rect x="-1.5" y="-5" width="3" height="8" rx="0.5" fill={`${cfg.color}40`} />
            <rect x="-4" y="-7" width="8" height="3" rx="0.5" fill={`${cfg.color}50`} />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Get the hex color for an agent role (for inline styles). */
export function agentColor(role: AgentRole): string {
  return AVATAR_CONFIG[role].color;
}
