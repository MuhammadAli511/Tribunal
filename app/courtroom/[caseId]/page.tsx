"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourtroomLayout } from "@/components/court/CourtroomLayout";
import { AgentPanel } from "@/components/court/AgentPanel";
import { ArgumentFeed } from "@/components/court/ArgumentFeed";
import { CrossExamDialog } from "@/components/court/CrossExamDialog";
import { Badge } from "@/components/ui/badge";
import { useCaseSession } from "@/hooks/useCaseSession";
import { useDebateFeed } from "@/hooks/useDebateFeed";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { AgentRole, DebateEvent } from "@/src/types";

export default function CourtroomPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;

  // Debate feed (SSE) — accumulates state
  const feed = useDebateFeed({ caseId });

  // WebSocket — for bidirectional communication
  const { send } = useCaseSession({
    caseId,
    onEvent: feed.handleEvent,
  });

  // Audio player — queues and plays TTS audio
  const audio = useAudioPlayer({ onItemPlayed: feed.markAudioPlayed });

  // Enqueue audio from the feed
  useEffect(() => {
    if (feed.audioQueue.length > 0) {
      const latest = feed.audioQueue[feed.audioQueue.length - 1];
      audio.enqueue(latest.role, latest.audioBase64);
    }
    // Only trigger when queue length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.audioQueue.length]);

  // Cross-exam state
  const [crossExamOpen, setCrossExamOpen] = useState(false);
  const [crossExamQuestion, setCrossExamQuestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");

  // Listen for cross-exam clarification events
  useEffect(() => {
    const lastClarification = feed.clarifications[feed.clarifications.length - 1];
    if (
      lastClarification &&
      !lastClarification.answer &&
      feed.status === "cross-exam"
    ) {
      setCrossExamQuestion(lastClarification.question);
      setCrossExamOpen(true);
    }
  }, [feed.clarifications, feed.status]);

  // Navigate to verdict page when verdict is delivered
  useEffect(() => {
    if (feed.verdict) {
      const timer = setTimeout(() => {
        router.push(`/verdict/${caseId}`);
      }, 3000); // Short delay to let verdict TTS finish
      return () => clearTimeout(timer);
    }
  }, [feed.verdict, caseId, router]);

  // Get latest argument per agent for the panels
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

  return (
    <div className="flex min-h-svh">
      {/* Main courtroom area */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">The Tribunal</h1>
          <Badge variant={feed.status === "deliberating" ? "secondary" : "outline"}>
            {feed.status === "intake" && "Intake"}
            {feed.status === "debating" && "In Session"}
            {feed.status === "cross-exam" && "Cross-Examination"}
            {feed.status === "deliberating" && "Deliberating..."}
            {feed.status === "verdict" && "Verdict Delivered"}
          </Badge>
        </div>

        {/* Courtroom grid */}
        <CourtroomLayout
          className="flex-1"
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
              argumentText={crossExamQuestion || undefined}
              isSpeaking={audio.currentRole === "judge"}
            />
          }
        />
      </div>

      {/* Transcript sidebar */}
      <div className="hidden w-80 border-l lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Transcript</h2>
          </div>
          <ArgumentFeed arguments={feed.arguments} className="flex-1" />
        </div>
      </div>

      {/* Cross-examination dialog */}
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
