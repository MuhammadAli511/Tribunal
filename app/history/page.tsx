"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseHistoryCard } from "@/components/court/CaseHistoryCard";
import { VerdictCard } from "@/components/court/VerdictCard";
import { ArgumentFeed } from "@/components/court/ArgumentFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CaseRecord, CaseSummary, DetectedPattern } from "@/src/types";

export default function HistoryPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail sheet state
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Fetch case list and patterns
  useEffect(() => {
    async function load() {
      try {
        const [casesRes, patternsRes] = await Promise.all([
          fetch("/api/cases"),
          fetch("/api/cases").then(() =>
            // Patterns come from the historian DO — use the cases endpoint for now
            // In production, this would be a separate endpoint
            Promise.resolve({ patterns: [] as DetectedPattern[] }),
          ),
        ]);

        if (casesRes.ok) {
          setCases((await casesRes.json()) as CaseSummary[]);
        }
        setPatterns(patternsRes.patterns);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCardClick = async (caseId: string) => {
    setSheetOpen(true);
    setSheetLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) {
        setSelectedCase((await res.json()) as CaseRecord);
      }
    } finally {
      setSheetLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-svh max-w-5xl p-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Case History</h1>
          <p className="text-sm text-muted-foreground">
            Past decisions reviewed by the tribunal
          </p>
        </div>
        <Button onClick={() => router.push("/lobby")}>New Case</Button>
      </div>

      {/* Patterns summary */}
      {patterns.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Detected Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {patterns.map((p) => (
                <Badge key={p.id} variant="secondary">
                  {p.description}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cases grid */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading cases...
        </p>
      ) : cases.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No cases have been reviewed yet.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/lobby")}
          >
            Present Your First Case
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseHistoryCard
              key={c.caseId}
              caseSummary={c}
              onClick={() => handleCardClick(c.caseId)}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Case Details</SheetTitle>
          </SheetHeader>

          {sheetLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : selectedCase ? (
            <div className="mt-4 flex flex-col gap-6">
              {/* Brief */}
              <div>
                <h3 className="mb-1 text-sm font-medium">Decision</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCase.brief.text}
                </p>
              </div>

              {/* Verdict */}
              {selectedCase.verdict && (
                <VerdictCard verdict={selectedCase.verdict} />
              )}

              {/* Full transcript */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Full Transcript</h3>
                <div className="max-h-96 overflow-y-auto rounded-md border">
                  <ArgumentFeed
                    arguments={selectedCase.rounds.flatMap((r) => r.arguments)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
