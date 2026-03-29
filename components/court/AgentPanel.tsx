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
  className?: string;
}

export function AgentPanel({
  role,
  argumentText,
  isSpeaking,
  className,
}: AgentPanelProps) {
  const color = agentColor(role);

  return (
    <div
      className={cn(
        "rounded-[10px] border bg-[#1a1917] p-3 transition-all duration-300",
        isSpeaking
          ? "border-current/25"
          : "border-[#1f1e1b]",
        className,
      )}
      style={isSpeaking ? { borderColor: `${color}40` } : undefined}
    >
      <div className="mb-2 flex items-center gap-2">
        <AgentAvatar role={role} size="sm" className="h-6 w-6 text-xs" />
        <span className="text-[11px] font-semibold text-[#ede9e1]">
          {AGENT_LABELS[role]}
        </span>
        <AudioWaveform
          isActive={isSpeaking}
          className="ml-auto h-4"
          style={{ color }}
        />
      </div>
      {argumentText ? (
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
