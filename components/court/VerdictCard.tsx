import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RulingBadge } from "@/components/shared/RulingBadge";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/src/types";

interface VerdictCardProps {
  verdict: Verdict;
  className?: string;
}

export function VerdictCard({ verdict, className }: VerdictCardProps) {
  return (
    <Card className={cn("max-w-2xl", className)}>
      {/* Section 1: Ruling */}
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg">Verdict</CardTitle>
        <RulingBadge ruling={verdict.ruling} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Section 2: Key Factors */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Key Factors
          </h3>
          <ul className="space-y-1.5">
            {verdict.keyFactors.map((factor, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                {factor}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Section 3: Conditions */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Conditions for Change
          </h3>
          <ul className="space-y-1.5">
            {verdict.conditions.map((condition, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" />
                {condition}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Section 4: Dissent */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Dissent</h3>
          <p className="text-sm italic text-muted-foreground leading-relaxed">
            &ldquo;{verdict.dissent}&rdquo;
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
