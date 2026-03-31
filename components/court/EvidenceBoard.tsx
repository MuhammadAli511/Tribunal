"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { agentColor } from "@/components/shared/AgentAvatar";
import { cn } from "@/lib/utils";
import type { Argument } from "@/src/types";
import { AGENT_LABELS } from "@/src/voice/voice-config";

interface EvidenceBoardProps {
  arguments: Argument[];
  sentimentScores: { role: string; score: number }[];
  className?: string;
}

export function EvidenceBoard({ arguments: args, sentimentScores, className }: EvidenceBoardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const pinnedClaims = useMemo(() => {
    const scoreMap = new Map<string, number>();
    args.forEach((arg, i) => {
      if (sentimentScores[i]) {
        scoreMap.set(arg.id, Math.abs(sentimentScores[i].score));
      }
    });

    const rebuttalTargets = new Set(args.filter((a) => a.rebuttalTargetId).map((a) => a.rebuttalTargetId));

    return args
      .filter((arg) => {
        const score = scoreMap.get(arg.id) ?? 0;
        return score > 0.6;
      })
      .slice(-6)
      .map((arg) => ({
        ...arg,
        isRebutted: rebuttalTargets.has(arg.id),
      }));
  }, [args, sentimentScores]);

  if (pinnedClaims.length === 0) return null;

  return (
    <div className={cn("border-b border-[#1f1e1b]", className)}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#52504a]">
          Key Claims ({pinnedClaims.length})
        </span>
        {collapsed ? (
          <ChevronDown className="h-3 w-3 text-[#52504a]" />
        ) : (
          <ChevronUp className="h-3 w-3 text-[#52504a]" />
        )}
      </button>
      {!collapsed && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {pinnedClaims.map((claim) => {
            const color = agentColor(claim.role);
            // Extract first sentence as the key claim
            const firstSentence = claim.text.split(/(?<=[.!?])\s/)[0] ?? claim.text;
            const short = firstSentence.length > 60 ? firstSentence.slice(0, 57) + "..." : firstSentence;
            return (
              <div
                key={claim.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-opacity",
                  claim.isRebutted && "opacity-40 line-through",
                )}
                style={{
                  background: `${color}0a`,
                  border: `1px solid ${color}20`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-[8px] leading-tight text-[#a39e93]">
                  {short}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
