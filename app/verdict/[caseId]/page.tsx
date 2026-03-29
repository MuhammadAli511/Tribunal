"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VerdictCard } from "@/components/court/VerdictCard";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/court/AudioWaveform";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { CaseRecord } from "@/src/types";

export default function VerdictPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const audio = useAudioPlayer();

  // Fetch case record
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (res.ok) {
          const record = (await res.json()) as CaseRecord;
          setCaseRecord(record);
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
        <p className="text-sm text-muted-foreground">Loading verdict...</p>
      </div>
    );
  }

  if (!caseRecord?.verdict) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No verdict found for this case.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/lobby")}
          >
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      {/* Judge speaking indicator */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">The Court Has Ruled</h1>
        <AudioWaveform
          isActive={audio.isPlaying}
          barCount={7}
          className="h-6"
        />
      </div>

      {/* Verdict card */}
      <VerdictCard verdict={caseRecord.verdict} className="w-full max-w-2xl" />

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/history")}>
          View Past Cases
        </Button>
        <Button onClick={() => router.push("/lobby")}>
          Bring Another Case
        </Button>
      </div>
    </div>
  );
}
