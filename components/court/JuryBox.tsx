"use client";

import { cn } from "@/lib/utils";
import { RulingBadge } from "@/components/shared/RulingBadge";
import type { JuryVerdict } from "@/src/types";
import { motion } from "motion/react";
import { Sun, ShieldAlert, Wrench, Heart, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const JUROR_ICONS: Record<string, LucideIcon> = {
  "The Optimist": Sun,
  "The Skeptic": ShieldAlert,
  "The Pragmatist": Wrench,
  "The Ethicist": Heart,
  "The Maverick": Zap,
};

const JUROR_COLORS: Record<string, string> = {
  "The Optimist": "#4ead6b",
  "The Skeptic": "#e35d5d",
  "The Pragmatist": "#a39e93",
  "The Ethicist": "#b06ed4",
  "The Maverick": "#e8a830",
};

interface JuryBoxProps {
  juryVerdict: JuryVerdict;
  className?: string;
}

export function JuryBox({ juryVerdict, className }: JuryBoxProps) {
  const { votes, tally } = juryVerdict;

  const tallyLabel = [
    tally.proceed > 0 ? `${tally.proceed} Proceed` : "",
    tally.against > 0 ? `${tally.against} Against` : "",
    tally.conditional > 0 ? `${tally.conditional} Conditional` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className={cn("mt-6", className)}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
          Jury Vote
        </span>
        <span className="text-[10px] text-[#52504a]">{tallyLabel}</span>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-5 gap-2"
      >
        {votes.map((vote) => {
          const Icon = JUROR_ICONS[vote.name] ?? Zap;
          const color = JUROR_COLORS[vote.name] ?? "#a39e93";
          return (
            <motion.div
              key={vote.name}
              variants={item}
              className="flex flex-col items-center gap-2 rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] px-2 py-3"
            >
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="text-center text-[9px] font-medium text-[#a39e93]">
                {vote.name.replace("The ", "")}
              </span>
              <RulingBadge ruling={vote.vote} className="text-[8px]" />
              <p className="text-center text-[8px] leading-tight text-[#52504a]">
                {vote.rationale}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
