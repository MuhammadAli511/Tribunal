import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    year: "numeric",
  });

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/30",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex-row items-start justify-between gap-2">
        <CardTitle className="line-clamp-2 text-sm">
          {caseSummary.briefSnippet}
        </CardTitle>
        <RulingBadge ruling={caseSummary.ruling} />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </CardContent>
    </Card>
  );
}
