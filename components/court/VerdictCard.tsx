import { RulingBadge } from "@/components/shared/RulingBadge";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/src/types";

interface VerdictCardProps {
  verdict: Verdict;
  className?: string;
}

export function VerdictCard({ verdict, className }: VerdictCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-[#1f1e1b] bg-[#1a1917]",
        className,
      )}
    >
      {/* Ruling header */}
      <div className="flex items-center justify-between border-b border-[#1f1e1b] px-4 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
          Ruling
        </span>
        <RulingBadge ruling={verdict.ruling} />
      </div>

      {/* Key Factors */}
      <div className="border-b border-[#1f1e1b] px-4 py-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
          Key Factors
        </span>
        <ul className="mt-2.5 space-y-1.5">
          {verdict.keyFactors.map((factor, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-[#a39e93]"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a39e93]" />
              {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* Conditions */}
      <div className="border-b border-[#1f1e1b] px-4 py-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
          Conditions for Change
        </span>
        <ul className="mt-2.5 space-y-1.5">
          {verdict.conditions.map((condition, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-[#a39e93]"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#e8a830]" />
              {condition}
            </li>
          ))}
        </ul>
      </div>

      {/* Dissent */}
      <div className="px-4 py-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
          Dissent
        </span>
        <p className="mt-2.5 border-l-2 border-[#2a2826] pl-3 text-[12px] italic leading-relaxed text-[#7a756c]">
          &ldquo;{verdict.dissent}&rdquo;
        </p>
      </div>
    </div>
  );
}
