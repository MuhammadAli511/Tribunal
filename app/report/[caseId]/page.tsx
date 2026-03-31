"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RulingBadge } from "@/components/shared/RulingBadge";
import type { CaseRecord } from "@/src/types";

export default function ReportPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (res.ok) {
          setCaseRecord((await res.json()) as CaseRecord);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#121210]">
        <p className="text-[12px] text-[#7a756c]">Loading report...</p>
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#121210]">
        <p className="text-[12px] text-[#7a756c]">Case not found.</p>
      </div>
    );
  }

  const allArguments = caseRecord.rounds.flatMap((r) => r.arguments);
  const userResponse = caseRecord.rounds.find((r) => r.userResponse)?.userResponse;

  return (
    <div className="min-h-svh bg-[#121210] text-[#ede9e1]">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { background: white !important; color: #1a1a1a !important; padding: 2rem !important; }
          .print-page * { color: inherit !important; border-color: #e5e5e5 !important; }
        }
      `}</style>

      <div className="print-page mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 border-b border-[#1f1e1b] pb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#52504a]">
                Tribunal Case Report
              </span>
              <h1 className="mt-1 text-lg font-bold">Case #{caseId.slice(0, 8)}</h1>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#52504a]">
                {new Date(caseRecord.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {caseRecord.verdict && (
                <div className="mt-1">
                  <RulingBadge ruling={caseRecord.verdict.ruling} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decision Brief */}
        <ReportSection title="Decision Brief">
          <p className="text-[12px] leading-relaxed text-[#a39e93]">{caseRecord.brief.text}</p>
        </ReportSection>

        {/* Clarifications */}
        {caseRecord.clarifications.length > 0 && (
          <ReportSection title="Clarifications">
            {caseRecord.clarifications.map((c, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-[11px] font-medium text-[#7a756c]">Q{c.index}: {c.question}</p>
                <p className="mt-1 text-[12px] text-[#a39e93]">{c.answer || "No answer provided"}</p>
              </div>
            ))}
          </ReportSection>
        )}

        {/* Court Arguments */}
        <ReportSection title="Court Arguments">
          {allArguments.map((arg) => (
            <div key={arg.id} className="mb-4 last:mb-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#7a756c]">
                  {arg.role}
                </span>
                <span className="text-[9px] text-[#52504a]">
                  Round {arg.round}{arg.rebuttalTargetId ? " (Rebuttal)" : ""}
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#a39e93]">{arg.text}</p>
            </div>
          ))}
        </ReportSection>

        {/* Cross-Examination */}
        {userResponse && (
          <ReportSection title="Cross-Examination Response">
            <p className="text-[12px] text-[#a39e93]">{userResponse}</p>
          </ReportSection>
        )}

        {/* Verdict */}
        {caseRecord.verdict && (
          <ReportSection title="Verdict">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] text-[#7a756c]">Ruling:</span>
              <RulingBadge ruling={caseRecord.verdict.ruling} />
            </div>
            <div className="mb-3">
              <span className="text-[10px] font-medium text-[#7a756c]">Key Factors</span>
              <ul className="mt-1 space-y-1">
                {caseRecord.verdict.keyFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#a39e93]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a39e93]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-3">
              <span className="text-[10px] font-medium text-[#7a756c]">Conditions for Change</span>
              <ul className="mt-1 space-y-1">
                {caseRecord.verdict.conditions.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#a39e93]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#e8a830]" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-[10px] font-medium text-[#7a756c]">Dissent</span>
              <p className="mt-1 border-l-2 border-[#2a2826] pl-3 text-[12px] italic text-[#7a756c]">
                &ldquo;{caseRecord.verdict.dissent}&rdquo;
              </p>
            </div>
          </ReportSection>
        )}

        {/* Jury Vote */}
        {caseRecord.juryVerdict && (
          <ReportSection title="Jury Vote">
            <div className="mb-2 text-[10px] text-[#52504a]">
              {caseRecord.juryVerdict.tally.proceed} Proceed
              {" · "}
              {caseRecord.juryVerdict.tally.against} Against
              {" · "}
              {caseRecord.juryVerdict.tally.conditional} Conditional
            </div>
            {caseRecord.juryVerdict.votes.map((v) => (
              <div key={v.name} className="mb-2 flex items-start gap-2 last:mb-0">
                <RulingBadge ruling={v.vote} className="mt-0.5 text-[8px]" />
                <div>
                  <span className="text-[10px] font-medium text-[#a39e93]">{v.name}</span>
                  <p className="text-[10px] text-[#52504a]">{v.rationale}</p>
                </div>
              </div>
            ))}
          </ReportSection>
        )}

        {/* Footer */}
        <div className="mt-10 border-t border-[#1f1e1b] pt-4 text-center">
          <p className="text-[9px] text-[#52504a]">Generated by Tribunal — AI-Powered Decision Court</p>
        </div>

        {/* Action buttons */}
        <div className="no-print mt-6 flex justify-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-[#2a2826] px-5 py-2.5 text-[12px] text-[#7a756c] transition-colors hover:border-[#7a756c] hover:text-[#a39e93]"
          >
            Download PDF
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="rounded-lg bg-[#ede9e1] px-5 py-2.5 text-[12px] font-semibold text-[#121210] transition-opacity hover:opacity-90"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7a756c]">{title}</h2>
      {children}
    </div>
  );
}
