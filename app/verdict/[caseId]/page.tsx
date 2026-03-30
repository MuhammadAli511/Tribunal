"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { VerdictCard } from "@/components/court/VerdictCard";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { AudioWaveform } from "@/components/court/AudioWaveform";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAtmosphere } from "@/components/atmosphere/AtmosphereProvider";
import type { CaseRecord } from "@/src/types";

export default function VerdictPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const audio = useAudioPlayer();
  const { setMood } = useAtmosphere();

  useEffect(() => {
    setMood("verdict");
  }, [setMood]);

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
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-[12px] text-[#7a756c]">Loading verdict...</p>
      </div>
    );
  }

  if (!caseRecord?.verdict) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <p className="text-[12px] text-[#7a756c]">No verdict found for this case.</p>
          <button
            onClick={() => router.push("/lobby")}
            className="mt-4 rounded-lg border border-[#2a2826] px-4 py-2 text-[12px] text-[#7a756c] transition-colors hover:border-[#7a756c] hover:text-[#a39e93]"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1e1b] px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚖️</span>
          <span className="text-[13px] font-semibold text-[#ede9e1]">Tribunal</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5b8def]/20 bg-[#5b8def]/8 px-2.5 py-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5b8def]">
            Verdict Delivered
          </span>
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" as const }}
          className="w-full max-w-xl"
        >
          <div className="mb-8 text-center">
            <AgentAvatar
              role="judge"
              size="lg"
              state={audio.isPlaying ? "speaking" : "idle"}
              className="mx-auto"
            />
            <h1 className="mt-4 text-xl font-bold text-[#ede9e1]">
              The Court Has Ruled
            </h1>
            <AudioWaveform
              isActive={audio.isPlaying}
              barCount={7}
              className="mx-auto mt-2 h-5 text-[#5b8def]"
            />
          </div>

          <VerdictCard verdict={caseRecord.verdict} />

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push("/history")}
              className="rounded-lg border border-[#2a2826] px-5 py-2.5 text-[12px] text-[#7a756c] transition-colors hover:border-[#7a756c] hover:text-[#a39e93]"
            >
              View Past Cases
            </button>
            <button
              onClick={() => router.push("/lobby")}
              className="rounded-lg bg-[#ede9e1] px-5 py-2.5 text-[12px] font-semibold text-[#121210] transition-opacity hover:opacity-90"
            >
              Bring Another Case
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
