"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtmosphere } from "@/components/atmosphere/AtmosphereProvider";
import { VerdictCard } from "@/components/court/VerdictCard";
import { ArgumentFeed } from "@/components/court/ArgumentFeed";
import { ArrowLeft } from "lucide-react";
import type { CaseRecord } from "@/src/types";

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { setMood } = useAtmosphere();

  useEffect(() => {
    setMood("history");
  }, [setMood]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (res.ok) {
          setCaseData((await res.json()) as CaseRecord);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseId]);

  return (
    <div className="min-h-svh">
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

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Back link */}
        <button
          onClick={() => router.push("/history")}
          className="mb-6 flex items-center gap-1.5 text-[12px] text-[#7a756c] transition-colors hover:text-[#a39e93]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Case History
        </button>

        <h1 className="mb-6 text-lg font-bold text-[#ede9e1]">Case Details</h1>

        {loading ? (
          <p className="py-12 text-center text-[12px] text-[#7a756c]">
            Loading...
          </p>
        ) : caseData ? (
          <div className="flex flex-col gap-6">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                Decision
              </span>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#a39e93]">
                {caseData.brief.text}
              </p>
            </div>

            {caseData.verdict && (
              <VerdictCard verdict={caseData.verdict} />
            )}

            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                Full Transcript
              </span>
              <div className="mt-2 overflow-y-auto rounded-[10px] border border-[#1f1e1b]">
                <ArgumentFeed
                  arguments={caseData.rounds.flatMap((r) => r.arguments)}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-[12px] text-[#7a756c]">
            Case not found.
          </p>
        )}
      </div>
    </div>
  );
}
