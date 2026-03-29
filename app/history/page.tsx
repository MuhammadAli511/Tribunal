"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CaseHistoryCard } from "@/components/court/CaseHistoryCard";
import { VerdictCard } from "@/components/court/VerdictCard";
import { ArgumentFeed } from "@/components/court/ArgumentFeed";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CaseRecord, CaseSummary, DetectedPattern } from "@/src/types";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function HistoryPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [casesRes, patternsRes] = await Promise.all([
          fetch("/api/cases"),
          fetch("/api/cases").then(() =>
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
    <div className="min-h-svh bg-[#121210]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1e1b] px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚖️</span>
          <span className="text-[13px] font-semibold text-[#ede9e1]">Tribunal</span>
        </div>
        <button
          onClick={() => router.push("/lobby")}
          className="rounded-lg bg-[#ede9e1] px-4 py-1.5 text-[11px] font-semibold text-[#121210] transition-opacity hover:opacity-90"
        >
          New Case
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-[#ede9e1]">Case History</h1>
          <p className="mt-0.5 text-[12px] text-[#7a756c]">
            Your past decisions and their verdicts.
          </p>
        </div>

        {/* Patterns */}
        {patterns.length > 0 && (
          <div className="mb-5 rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
              Detected Patterns
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {patterns.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center rounded-full border border-[#b06ed4]/20 bg-[#b06ed4]/8 px-2.5 py-0.5 font-mono text-[9px] text-[#b06ed4]"
                >
                  {p.description}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cases grid */}
        {loading ? (
          <p className="py-12 text-center text-[12px] text-[#7a756c]">
            Loading cases...
          </p>
        ) : cases.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[12px] text-[#7a756c]">
              No cases have been reviewed yet.
            </p>
            <button
              onClick={() => router.push("/lobby")}
              className="mt-4 rounded-lg border border-[#2a2826] px-4 py-2 text-[12px] text-[#7a756c] transition-colors hover:border-[#7a756c] hover:text-[#a39e93]"
            >
              Present Your First Case
            </button>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {cases.map((c) => (
              <motion.div key={c.caseId} variants={item}>
                <CaseHistoryCard
                  caseSummary={c}
                  onClick={() => handleCardClick(c.caseId)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Case Details</SheetTitle>
          </SheetHeader>

          {sheetLoading ? (
            <p className="py-8 text-center text-[12px] text-[#7a756c]">
              Loading...
            </p>
          ) : selectedCase ? (
            <div className="mt-4 flex flex-col gap-6">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                  Decision
                </span>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#a39e93]">
                  {selectedCase.brief.text}
                </p>
              </div>

              {selectedCase.verdict && (
                <VerdictCard verdict={selectedCase.verdict} />
              )}

              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                  Full Transcript
                </span>
                <div className="mt-2 max-h-96 overflow-y-auto rounded-[10px] border border-[#1f1e1b]">
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
