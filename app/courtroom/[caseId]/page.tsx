"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourtroomLayout } from "@/components/court/CourtroomLayout";
import { AgentPanel } from "@/components/court/AgentPanel";
import { ArgumentFeed } from "@/components/court/ArgumentFeed";
import { CrossExamDialog } from "@/components/court/CrossExamDialog";
import { useCaseSession } from "@/hooks/useCaseSession";
import { useDebateFeed } from "@/hooks/useDebateFeed";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { AgentRole } from "@/src/types";

export default function CourtroomPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;

  const feed = useDebateFeed();
  const { send } = useCaseSession({
    caseId,
    onEvent: (event) => {
      feed.handleEvent(event);
    },
  });

  const [ttsPlaying, setTtsPlaying] = useState(false);

  const audio = useAudioPlayer({
    onItemPlayed: () => {
      setTtsPlaying(false);
    },
  });

  useEffect(() => {
    if (ttsPlaying) return;
    if (feed.pendingSpeaking.length === 0) return;
    const next = feed.pendingSpeaking[0];
    setTtsPlaying(true);
    feed.revealNext();
    audio.enqueue(next.argument.role, next.audioBase64);
  }, [ttsPlaying, feed.pendingSpeaking, audio, feed]);

  const [crossExamOpen, setCrossExamOpen] = useState(false);
  const [crossExamQuestion, setCrossExamQuestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");

  useEffect(() => {
    const lastClarification = feed.clarifications[feed.clarifications.length - 1];
    if (lastClarification && !lastClarification.answer && feed.status === "cross-exam") {
      setCrossExamQuestion(lastClarification.question);
      setCrossExamOpen(true);
    }
  }, [feed.clarifications, feed.status]);

  // Flush the buffered verdict only after all TTS audio has finished playing
  useEffect(() => {
    if (!ttsPlaying && feed.pendingSpeaking.length === 0 && feed.pendingVerdict) {
      feed.flushVerdict();
    }
  }, [ttsPlaying, feed.pendingSpeaking.length, feed.pendingVerdict, feed]);

  useEffect(() => {
    if (feed.verdict) {
      const timer = setTimeout(() => router.push(`/verdict/${caseId}`), 3000);
      return () => clearTimeout(timer);
    }
  }, [feed.verdict, caseId, router]);

  const latestArgByRole = (role: AgentRole): string | undefined => {
    const args = feed.arguments.filter((a) => a.role === role);
    return args[args.length - 1]?.text;
  };

  const handleCrossExamSubmit = useCallback(
    (response: string) => {
      fetch(`/api/cases/${caseId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: 1, text: response }),
      });
      setCrossExamOpen(false);
      setUserTranscript("");
    },
    [caseId],
  );

  const statusLabel: Record<string, string> = {
    intake: "Intake",
    debating: "In Session",
    "cross-exam": "Cross-Examination",
    deliberating: "Deliberating...",
    verdict: "Verdict Delivered",
  };

  return (
    <div className="flex h-svh overflow-hidden bg-[#121210]">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#1f1e1b] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚖️</span>
            <span className="text-[12px] font-semibold text-[#ede9e1]">
              Case #{caseId.slice(0, 4)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ead6b]/20 bg-[#4ead6b]/8 px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ead6b]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#4ead6b]">
                {statusLabel[feed.status] || feed.status}
              </span>
            </span>
          </div>
        </div>

        {/* Agent grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <CourtroomLayout
            prosecutor={
              <AgentPanel
                role="prosecutor"
                argumentText={latestArgByRole("prosecutor")}
                isSpeaking={audio.currentRole === "prosecutor"}
              />
            }
            defender={
              <AgentPanel
                role="defender"
                argumentText={latestArgByRole("defender")}
                isSpeaking={audio.currentRole === "defender"}
              />
            }
            expert={
              <AgentPanel
                role="domain-expert"
                argumentText={latestArgByRole("domain-expert")}
                isSpeaking={audio.currentRole === "domain-expert"}
              />
            }
            historian={
              <AgentPanel
                role="historian"
                argumentText={latestArgByRole("historian")}
                isSpeaking={audio.currentRole === "historian"}
              />
            }
            judge={
              <AgentPanel
                role="judge"
                argumentText={latestArgByRole("judge") || crossExamQuestion || undefined}
                isSpeaking={audio.currentRole === "judge"}
              />
            }
          />
        </div>
      </div>

      {/* Transcript sidebar */}
      <div className="hidden w-[280px] border-l border-[#1f1e1b] lg:flex lg:flex-col">
        <div className="shrink-0 border-b border-[#1f1e1b] px-3 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#52504a]">
            Live Transcript
          </span>
        </div>
        <ArgumentFeed arguments={feed.arguments} className="flex-1 min-h-0" />
      </div>

      <CrossExamDialog
        open={crossExamOpen}
        question={crossExamQuestion}
        isJudgeSpeaking={audio.currentRole === "judge"}
        isRecording={isRecording}
        transcript={userTranscript}
        onStartRecording={() => setIsRecording(true)}
        onStopRecording={() => setIsRecording(false)}
        onSubmit={handleCrossExamSubmit}
      />
    </div>
  );
}
