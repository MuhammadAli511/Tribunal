"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourtroomLayout } from "@/components/court/CourtroomLayout";
import { AgentPanel } from "@/components/court/AgentPanel";
import { ArgumentFeed } from "@/components/court/ArgumentFeed";
import { CrossExamDialog } from "@/components/court/CrossExamDialog";
import { MomentumBar } from "@/components/court/MomentumBar";
import { PulseTimeline } from "@/components/court/PulseTimeline";
import { SessionBanner } from "@/components/court/SessionBanner";
import { VerdictReveal } from "@/components/court/VerdictReveal";
import { ObjectionBanner } from "@/components/court/ObjectionBanner";
import { EvidenceBoard } from "@/components/court/EvidenceBoard";
import { useCaseSession } from "@/hooks/useCaseSession";
import { useDebateFeed } from "@/hooks/useDebateFeed";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import type { AgentRole } from "@/src/types";
import { useAtmosphere } from "@/components/atmosphere/AtmosphereProvider";
import type { MoodName } from "@/components/atmosphere/types";

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
  const [shaking, setShaking] = useState(false);
  const [verdictRevealing, setVerdictRevealing] = useState(false);
  const [objection, setObjection] = useState<{ role: AgentRole; id: string } | null>(null);

  const { setMood } = useAtmosphere();
  const sfx = useSoundEffects();
  const prevJudgeSpeaking = useRef(false);

  // Map debate status to atmosphere mood
  useEffect(() => {
    const moodMap: Record<string, MoodName> = {
      intake: "courtroom-intake",
      debating: "courtroom-debating",
      "cross-exam": "courtroom-crossexam",
      deliberating: "courtroom-deliberating",
      verdict: "courtroom-verdict",
    };
    const mood = moodMap[feed.status] || "courtroom-intake";
    const isDeliberation = feed.status === "deliberating";
    const useFlash = feed.status !== "intake" && !isDeliberation;
    setMood(mood, useFlash, isDeliberation);
  }, [feed.status, setMood]);

  // Start ambient audio on mount
  useEffect(() => {
    sfx.play("ambiance");
    return () => sfx.stop("ambiance");
  }, [sfx]);

  const audio = useAudioPlayer({
    onItemPlayed: () => {
      setTtsPlaying(false);
    },
  });

  // Gavel strike when judge starts speaking
  useEffect(() => {
    const isJudge = audio.currentRole === "judge";
    if (isJudge && !prevJudgeSpeaking.current) {
      sfx.play("gavel");
      setShaking(true);
      setTimeout(() => setShaking(false), 200);
    }
    prevJudgeSpeaking.current = isJudge;
  }, [audio.currentRole, sfx]);

  const momentum = feed.sentimentScores.reduce((sum, s) => sum + s.score, 0);
  const clampedMomentum = Math.max(-1, Math.min(1, momentum));

  // Compute per-side heat
  const prosecutionHeat = feed.sentimentScores
    .filter((s) => s.role === "prosecutor")
    .reduce((sum, s) => sum + Math.abs(s.score), 0);
  const defenseHeat = feed.sentimentScores
    .filter((s) => s.role === "defender")
    .reduce((sum, s) => sum + Math.abs(s.score), 0);

  // Detect objections (strong rebuttals)
  useEffect(() => {
    const lastArg = feed.arguments[feed.arguments.length - 1];
    if (!lastArg?.rebuttalTargetId) return;
    const lastSentiment = feed.sentimentScores[feed.sentimentScores.length - 1];
    if (lastSentiment && Math.abs(lastSentiment.score) > 0.7) {
      setObjection({ role: lastArg.role, id: lastArg.id });
    }
  }, [feed.arguments, feed.sentimentScores]);

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Wait until all queued audio has finished playing before showing the dialog
    if (ttsPlaying || feed.pendingSpeaking.length > 0) return;

    const lastClarification = feed.clarifications[feed.clarifications.length - 1];
    if (lastClarification && !lastClarification.answer && feed.status === "cross-exam") {
      setCrossExamQuestion(lastClarification.question);
      setCrossExamOpen(true);
    }
    // Auto-close dialog if status moves past cross-exam (e.g. user didn't answer in time)
    if (crossExamOpen && feed.status !== "cross-exam") {
      setCrossExamOpen(false);
    }
  }, [feed.clarifications, feed.status, crossExamOpen, ttsPlaying, feed.pendingSpeaking.length]);

  // Verdict reveal sequence
  useEffect(() => {
    if (!ttsPlaying && feed.pendingSpeaking.length === 0 && feed.pendingVerdict) {
      sfx.play("verdict");
      sfx.play("gavel");
      setVerdictRevealing(true);
      feed.flushVerdict();
    }
  }, [ttsPlaying, feed.pendingSpeaking.length, feed.pendingVerdict, feed, sfx]);

  const handleVerdictComplete = useCallback(() => {
    router.push(`/verdict/${caseId}`);
  }, [router, caseId]);

  const handleCrossExamSubmit = useCallback(
    (response: string) => {
      // Stop recorder if still running
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      setIsRecording(false);

      fetch(`/api/cases/${caseId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: 1, text: response }),
      });
      setCrossExamOpen(false);
      setUserTranscript("");
      // Immediately show deliberation state while waiting for round 2
      feed.handleEvent({ type: "status_change", status: "deliberating" });
    },
    [caseId, feed],
  );

  const transcribeAndSubmit = useCallback(
    async (chunks: Blob[]) => {
      if (chunks.length === 0) return;
      setIsTranscribing(true);
      setUserTranscript("Transcribing...");
      try {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const { text } = (await res.json()) as { text: string };
        if (text?.trim()) {
          handleCrossExamSubmit(text.trim());
        } else {
          setUserTranscript("");
        }
      } catch {
        setUserTranscript("");
      } finally {
        setIsTranscribing(false);
      }
    },
    [handleCrossExamSubmit],
  );

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording — onstop handler will transcribe & submit
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop all mic tracks
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        mediaRecorderRef.current = null;
        transcribeAndSubmit(chunksRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setUserTranscript("");
    } catch {
      setIsRecording(false);
    }
  }, [isRecording, transcribeAndSubmit]);

  const statusLabel: Record<string, string> = {
    intake: "Intake",
    debating: "In Session",
    "cross-exam": "Cross-Examination",
    deliberating: "Deliberating...",
    verdict: "Verdict Delivered",
  };

  const latestArgByRole = (role: AgentRole): string | undefined => {
    const args = feed.arguments.filter((a) => a.role === role);
    return args[args.length - 1]?.text;
  };

  const isThinking = (role: AgentRole) => {
    // During deliberation before round 2, show prosecutor as preparing
    if (feed.status === "deliberating" && role === "prosecutor") return true;
    // During normal debating, show agents that haven't argued yet
    return (
      feed.status === "debating" &&
      !feed.arguments.some((a) => a.role === role) &&
      !audio.currentRole
    );
  };

  return (
    <div className={`flex h-svh overflow-hidden ${shaking ? "animate-screen-shake" : ""}`}>
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

        {feed.sentimentScores.length > 0 && (
          <div className="shrink-0 px-5 pt-2">
            <MomentumBar momentum={clampedMomentum} />
          </div>
        )}

        {/* Amphitheater stage */}
        <div className="relative flex-1 overflow-hidden p-3">
          <SessionBanner caseId={caseId} />
          <ObjectionBanner
            role={objection?.role ?? null}
            triggerId={objection?.id ?? null}
          />

          {verdictRevealing && feed.verdict && (
            <VerdictReveal verdict={feed.verdict} onComplete={handleVerdictComplete} />
          )}

          <CourtroomLayout
            prosecutionHeat={Math.min(1, prosecutionHeat * 0.5 + 0.04)}
            defenseHeat={Math.min(1, defenseHeat * 0.5 + 0.04)}
            className={verdictRevealing ? "opacity-30 transition-opacity duration-1000" : ""}
            prosecutor={
              <AgentPanel
                role="prosecutor"
                argumentText={latestArgByRole("prosecutor")}
                isSpeaking={audio.currentRole === "prosecutor"}
                isThinking={isThinking("prosecutor")}
              />
            }
            defender={
              <AgentPanel
                role="defender"
                argumentText={latestArgByRole("defender")}
                isSpeaking={audio.currentRole === "defender"}
                isThinking={isThinking("defender")}
              />
            }
            expert={
              <AgentPanel
                role="domain-expert"
                argumentText={latestArgByRole("domain-expert")}
                isSpeaking={audio.currentRole === "domain-expert"}
                isThinking={isThinking("domain-expert")}
              />
            }
            historian={
              <AgentPanel
                role="historian"
                argumentText={latestArgByRole("historian")}
                isSpeaking={audio.currentRole === "historian"}
                isThinking={isThinking("historian")}
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
        <EvidenceBoard
          arguments={feed.arguments}
          sentimentScores={feed.sentimentScores}
        />
        <ArgumentFeed arguments={feed.arguments} className="flex-1 min-h-0" />
        {feed.sentimentScores.length > 0 && (
          <div className="shrink-0 border-t border-[#1f1e1b] p-2">
            <PulseTimeline scores={feed.sentimentScores} />
          </div>
        )}
      </div>

      <CrossExamDialog
        open={crossExamOpen}
        question={crossExamQuestion}
        isJudgeSpeaking={audio.currentRole === "judge"}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        transcript={userTranscript}
        onToggleRecording={handleToggleRecording}
        onSubmit={handleCrossExamSubmit}
      />
    </div>
  );
}
