"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Argument } from "@/src/types";
import { AGENT_LABELS } from "@/src/voice/voice-config";
import { agentColor } from "@/components/shared/AgentAvatar";

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
      <div className="flex flex-col gap-3.5 p-3">
        {args.length === 0 && (
          <p className="py-8 text-center font-mono text-[10px] italic text-[#52504a]">
            The debate has not yet begun.
          </p>
        )}
        {args.map((arg, i) => {
          const color = agentColor(arg.role);
          return (
            <div key={arg.id}>
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#52504a]">
                  {AGENT_LABELS[arg.role]} · R{arg.round}
                </span>
                {arg.rebuttalTargetId && (
                  <span className="font-mono text-[7px] italic text-[#3a3835]">
                    (rebuttal)
                  </span>
                )}
                <span className="ml-auto font-mono text-[7px] tabular-nums text-[#3a3835]">
                  {String(i).padStart(2, "0")}:{String(i * 12).padStart(2, "0")}
                </span>
              </div>
              <p
                className="ml-[2px] border-l-[1.5px] pl-[11px] font-mono text-[10px] leading-[1.7] text-[#7a756c]"
                style={{ borderColor: `${color}20` }}
              >
                {arg.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
