import { RulingBadge } from "@/components/shared/RulingBadge";
import { cn } from "@/lib/utils";
import type { CaseSummary } from "@/src/types";

interface CaseHistoryCardProps {
  caseSummary: CaseSummary;
  onClick?: () => void;
  className?: string;
}

export function CaseHistoryCard({
  caseSummary,
  onClick,
  className,
}: CaseHistoryCardProps) {
  const date = new Date(caseSummary.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "cursor-pointer rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4 transition-colors hover:border-[#2a2826]",
        className,
      )}
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between">
        <span className="font-mono text-[9px] text-[#52504a]">
          {formattedDate}
        </span>
        <RulingBadge ruling={caseSummary.ruling} />
      </div>
      <p className="text-[12px] font-medium text-[#ede9e1]">
        {caseSummary.briefSnippet}
      </p>
      {caseSummary.summary && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#7a756c]">
          {caseSummary.summary}
        </p>
      )}
    </div>
  );
}
