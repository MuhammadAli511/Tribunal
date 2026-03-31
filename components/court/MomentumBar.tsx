"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface MomentumBarProps {
  momentum: number;
  className?: string;
}

export function MomentumBar({ momentum, className }: MomentumBarProps) {
  const position = ((momentum + 1) / 2) * 100;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex justify-between">
        <span className="text-[8px] text-[#e35d5d]">Do Not Proceed</span>
        <span className="font-mono text-[8px] text-[#52504a]">Sentiment</span>
        <span className="text-[8px] text-[#4ead6b]">Proceed</span>
      </div>
      <div className="relative h-2 w-full rounded-full border border-[#1f1e1b] bg-[#1a1917]">
        <div className="absolute left-1/2 top-0 h-full w-px bg-[#2a2826]" />
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-700"
          style={{
            left: momentum >= 0 ? "50%" : `${position}%`,
            right: momentum >= 0 ? `${100 - position}%` : "50%",
            background: momentum >= 0
              ? "linear-gradient(to right, #2a2826, #4ead6b)"
              : "linear-gradient(to left, #2a2826, #e35d5d)",
          }}
        />
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ede9e1] bg-[#121210]"
          animate={{ left: `${position}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
