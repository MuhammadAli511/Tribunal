"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MicButton } from "@/components/shared/MicButton";
import { AgentBadge } from "@/components/shared/AgentBadge";
import { AudioWaveform } from "@/components/court/AudioWaveform";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConvAI } from "@/hooks/useConvAI";
import { MicOff } from "lucide-react";
import type { Clarification } from "@/src/types";

const JUDGE_PROMPT = `You are the Judge in a decision tribunal. A person is about to tell you about a decision they are considering.

Listen carefully, then ask exactly 2-3 short clarifying questions to understand:
- What exactly is the decision
- What are the stakes (what happens if it goes wrong)
- Any constraints, deadlines, or who else is affected

Rules:
- Ask ONE question at a time, then WAIT for the answer
- Keep each question to ONE sentence
- After you have asked 3 questions total, say EXACTLY: "Thank you. The court has enough information. Please submit your case."
- Do NOT keep asking beyond 3 questions
- Do NOT give advice or instructions — you are only gathering information
- After saying "submit your case" do NOT speak again no matter what the user says`;

const JUDGE_FIRST_MESSAGE =
  "The court is now in session. Please state the decision you are considering.";

type LobbyPhase = "idle" | "speaking" | "ready";

export default function LobbyPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<LobbyPhase>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const clarificationsRef = useRef(clarifications);
  clarificationsRef.current = clarifications;

  const handleAgentResponse = useCallback((text: string) => {
    // Detect when the Judge is done asking questions
    const lower = text.toLowerCase();
    if (
      lower.includes("submit your case") ||
      lower.includes("enough information") ||
      lower.includes("court has enough")
    ) {
      setPhase("ready");
      return;
    }

    setClarifications((prev) => [
      ...prev,
      { question: text, answer: "", index: prev.length + 1 },
    ]);
  }, []);

  const handleUserTranscript = useCallback((text: string) => {
    const current = clarificationsRef.current;
    if (current.length === 0) {
      setTranscript((prev) => (prev ? prev + " " + text : text));
    } else {
      setClarifications((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && !last.answer) {
          updated[updated.length - 1] = { ...last, answer: text };
        }
        return updated;
      });
    }
  }, []);

  const { status, isSpeaking, connectionError, endSession } = useConvAI({
    enabled: phase === "speaking",
    prompt: JUDGE_PROMPT,
    firstMessage: JUDGE_FIRST_MESSAGE,
    onAgentResponse: handleAgentResponse,
    onUserTranscript: handleUserTranscript,
  });

  // Auto-end ConvAI session when phase becomes "ready"
  useEffect(() => {
    if (phase === "ready") {
      endSession();
    }
  }, [phase, endSession]);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clarifications.length, transcript]);

  const handleMicToggle = () => {
    if (phase === "speaking") {
      setPhase("ready");
    } else if (phase === "idle") {
      setPhase("speaking");
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) return;
    setIsSubmitting(true);
    setPhase("ready");
    endSession();

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
      const { caseId } = (await res.json()) as { caseId: string };

      for (const c of clarifications) {
        if (c.answer) {
          await fetch(`/api/cases/${caseId}/clarify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c),
          });
        }
      }

      await fetch(`/api/cases/${caseId}/start-debate`, { method: "POST" });
      router.push(`/courtroom/${caseId}`);
    } catch {
      setIsSubmitting(false);
    }
  };

  const isSessionLive = phase === "speaking" && status === "connected";

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Fixed header */}
      <div className="shrink-0 pt-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">The Tribunal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Present your decision to the court
        </p>
      </div>

      {/* Scrollable transcript area */}
      <ScrollArea className="flex-1 px-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6">
          {/* User's case brief */}
          {transcript && (
            <Card className="w-full">
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Your decision
                </p>
                <p className="text-sm leading-relaxed">{transcript}</p>
              </CardContent>
            </Card>
          )}

          {/* Clarification Q&A */}
          {clarifications.map((c, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <AgentBadge role="judge" className="shrink-0 mt-0.5" />
                <p className="text-sm">{c.question}</p>
              </div>
              {c.answer && (
                <p className="ml-14 text-sm text-muted-foreground">
                  {c.answer}
                </p>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Fixed bottom controls */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-4">
          {/* Ready state — prominent submit */}
          {phase === "ready" && transcript ? (
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-sm font-medium text-foreground">
                The court has enough information.
              </p>
              <Button
                size="lg"
                className="w-full text-base"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Submitting to the Court..."
                  : "Submit to the Court"}
              </Button>
              <button
                type="button"
                onClick={() => setPhase("speaking")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Continue speaking
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                {/* Mic toggle */}
                <MicButton
                  size={phase === "idle" ? "lg" : "default"}
                  isRecording={isSessionLive}
                  onPress={handleMicToggle}
                  onRelease={() => {}}
                />

                {/* End session button */}
                {phase === "speaking" && (
                  <button
                    type="button"
                    onClick={() => setPhase("ready")}
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-muted/50 text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-500"
                    title="End session"
                  >
                    <MicOff className="h-6 w-6" />
                  </button>
                )}
              </div>

              {/* Waveform + status */}
              <AudioWaveform
                isActive={isSpeaking}
                barCount={7}
                className="h-5"
              />
              <p className="text-xs text-muted-foreground">
                {status === "connecting"
                  ? "Connecting to the Judge..."
                  : isSessionLive
                    ? isSpeaking
                      ? "The Judge is speaking..."
                      : "Listening — speak your decision"
                    : status === "error"
                      ? connectionError || "Connection failed"
                      : "Tap the mic to begin"}
              </p>

              {/* Submit button (visible but secondary when session is live) */}
              {transcript && phase === "speaking" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPhase("ready")}
                >
                  Done speaking — submit case
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
