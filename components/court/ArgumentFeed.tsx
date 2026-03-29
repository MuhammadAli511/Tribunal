"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { cn } from "@/lib/utils";
import type { Argument } from "@/src/types";
import { AGENT_LABELS } from "@/src/voice/voice-config";

interface ArgumentFeedProps {
  arguments: Argument[];
  className?: string;
}

export function ArgumentFeed({
  arguments: args,
  className,
}: ArgumentFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [args.length]);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-3 p-3">
        {args.length === 0 && (
          <p className="py-8 text-center text-[11px] italic text-[#52504a]">
            The debate has not yet begun.
          </p>
        )}
        {args.map((arg) => (
          <div key={arg.id}>
            <div className="flex items-center gap-1.5 mb-1">
              <AgentAvatar role={arg.role} size="sm" className="h-3.5 w-3.5 text-[7px]" />
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#7a756c]">
                {AGENT_LABELS[arg.role]} · R{arg.round}
              </span>
              {arg.rebuttalTargetId && (
                <span className="font-mono text-[8px] italic text-[#52504a]">
                  (rebuttal)
                </span>
              )}
            </div>
            <p className="pl-5 text-[10px] leading-relaxed text-[#a39e93]">
              {arg.text}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
