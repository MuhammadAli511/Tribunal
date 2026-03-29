"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AgentBadge } from "@/components/shared/AgentBadge";
import { cn } from "@/lib/utils";
import type { Argument } from "@/src/types";

interface ArgumentFeedProps {
  arguments: Argument[];
  className?: string;
}

export function ArgumentFeed({
  arguments: args,
  className,
}: ArgumentFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new arguments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [args.length]);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-3 p-4">
        {args.length === 0 && (
          <p className="text-center text-sm italic text-muted-foreground/50 py-8">
            The debate has not yet begun.
          </p>
        )}
        {args.map((arg, i) => (
          <div key={arg.id}>
            {i > 0 && <Separator className="mb-3" />}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <AgentBadge role={arg.role} />
                <span className="text-xs text-muted-foreground">
                  Round {arg.round}
                </span>
                {arg.rebuttalTargetId && (
                  <span className="text-xs italic text-muted-foreground">
                    (rebuttal)
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {arg.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
