"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentBadge, agentRingColor } from "@/components/shared/AgentBadge";
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
  return (
    <Card
      className={cn(
        "relative transition-all duration-300",
        isSpeaking && `ring-2 ${agentRingColor(role)}`,
        className,
      )}
    >
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <span className="truncate">{AGENT_LABELS[role]}</span>
          <AgentBadge role={role} />
        </CardTitle>
        <AudioWaveform isActive={isSpeaking} className="h-5" />
      </CardHeader>
      <CardContent>
        {argumentText ? (
          <p className="line-clamp-6 text-sm text-muted-foreground leading-relaxed">
            {argumentText}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/50">
            Awaiting argument...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
