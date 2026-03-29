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

  // When there are pending speaking items and audio is not playing, reveal
  // the next one (adds argument to transcript) and start its audio.
  useEffect(() => {
    if (ttsPlaying) return;
    if (feed.pendingSpeaking.length === 0) return;

    const next = feed.pendingSpeaking[0];
    setTtsPlaying(true);
    feed.revealNext();
    audio.enqueue(next.argument.role, next.audioBase64);
  }, [ttsPlaying, feed.pendingSpeaking, audio, feed]);

  // Cross-exam state
  const [crossExamOpen, setCrossExamOpen] = useState(false);
  const [crossExamQuestion, setCrossExamQuestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");

  useEffect(() => {
    const lastClarification = feed.clarifications[feed.clarifications.length - 1];
    if (lastClarification && !lastClarification.answer && feed.status === "cross-exam") {
      console.log("[CrossExam] opening dialog:", lastClarification.question);
      setCrossExamQuestion(lastClarification.question);
      setCrossExamOpen(true);
    }
  }, [feed.clarifications, feed.status]);

  useEffect(() => {
    if (feed.verdict) {
      console.log("[Verdict] received, navigating in 3s:", feed.verdict);
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
      console.log("[CrossExam] submitting response:", response);
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
    <div className="flex h-svh overflow-hidden">
      {/* Main courtroom area */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        {/* Status bar */}
        <div className="flex shrink-0 items-center justify-between">
          <h1 className="text-lg font-semibold">The Tribunal</h1>
          <Badge variant={feed.status === "deliberating" ? "secondary" : "outline"}>
            {feed.status === "intake" && "Intake"}
            {feed.status === "debating" && "In Session"}
            {feed.status === "cross-exam" && "Cross-Examination"}
            {feed.status === "deliberating" && "Deliberating..."}
            {feed.status === "verdict" && "Verdict Delivered"}
          </Badge>
        </div>

        {/* Courtroom grid — scrollable */}
        <div className="flex-1 overflow-y-auto">
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

      {/* Transcript sidebar — fixed height, scrollable */}
      <div className="hidden w-80 border-l lg:flex lg:flex-col">
        <div className="shrink-0 border-b px-4 py-3">
          <h2 className="text-sm font-medium">Transcript</h2>
        </div>
        <ArgumentFeed arguments={feed.arguments} className="flex-1 min-h-0" />
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
