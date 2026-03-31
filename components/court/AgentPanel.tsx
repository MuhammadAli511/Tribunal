"use client";

import { AgentAvatar, agentColor } from "@/components/shared/AgentAvatar";
import { AudioWaveform } from "./AudioWaveform";
import { cn } from "@/lib/utils";
import type { AgentRole } from "@/src/types";
import { AGENT_LABELS } from "@/src/voice/voice-config";

interface AgentPanelProps {
  role: AgentRole;
  argumentText?: string;
  isSpeaking: boolean;
  isThinking?: boolean;
  className?: string;
}

export function AgentPanel({
  role,
  argumentText,
  isSpeaking,
  isThinking = false,
  className,
}: AgentPanelProps) {
  const color = agentColor(role);
  const isIdle = !isSpeaking && !isThinking && !!argumentText;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-3.5 transition-all duration-500",
        "bg-[rgba(26,25,23,0.7)] backdrop-blur-[16px]",
        isSpeaking
          ? "border-[color:var(--agent-color-20)]"
          : "border-[#1f1e1b80]",
        isIdle && "opacity-70",
        className,
      )}
      style={{
        ["--agent-color" as string]: color,
        ["--agent-color-10" as string]: `${color}1a`,
        ["--agent-color-20" as string]: `${color}33`,
        ...(isSpeaking
          ? {
              borderColor: `${color}33`,
              boxShadow: `0 0 0 1px ${color}1a, 0 8px 40px -12px ${color}, 0 0 80px -30px ${color}`,
            }
          : {}),
      }}
    >
      {/* Thinking particles */}
      {isThinking && (
        <div className="pointer-events-none absolute -top-2 left-1/2 h-12 w-12 -translate-x-1/2">
          {[0, -0.75, -1.5].map((delay, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: `${4 - i}px`,
                height: `${4 - i}px`,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 4px ${color}`,
                opacity: 0.6 - i * 0.15,
                animation: `t-orbit 2.2s linear infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-2.5">
        <div className="relative">
          <AgentAvatar role={role} size="sm" state={isSpeaking ? "speaking" : "idle"} className="h-[32px] w-[32px]" />
          {isSpeaking && (
            <span
              className="absolute -inset-[5px] rounded-full border animate-ring-fade"
              style={{ borderColor: color }}
            />
          )}
        </div>
        <span className="text-[11px] font-semibold text-[#ede9e1]">
          {role === "judge" ? "The Honorable Judge" : AGENT_LABELS[role]}
        </span>
        <AudioWaveform
          isActive={isSpeaking}
          className="ml-auto h-3.5"
          style={{ color }}
        />
      </div>
      {isThinking ? (
        <p className="text-[11px] italic leading-relaxed" style={{ color: `${color}66` }}>
          Analyzing...
        </p>
      ) : argumentText ? (
        <p className="line-clamp-4 text-[11px] leading-relaxed text-[#a39e93]">
          {argumentText}
        </p>
      ) : (
        <p className="text-[11px] italic text-[#52504a]">
          Awaiting argument...
        </p>
      )}
    </div>
  );
}
