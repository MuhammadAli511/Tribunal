"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider } from "@elevenlabs/react";
import { MicButton } from "@/components/shared/MicButton";
import { AgentBadge } from "@/components/shared/AgentBadge";
import { AudioWaveform } from "@/components/court/AudioWaveform";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConvAI } from "@/hooks/useConvAI";
import { MicOff } from "lucide-react";
import type { Clarification } from "@/src/types";

const JUDGE_PROMPT = `You are the Judge in a decision tribunal gathering information about a decision someone is considering.

IMPORTANT RULES — follow them in strict order:

1. WAIT for the user to state their decision. Accept it as-is. Do NOT restate or clarify it.

2. You MUST ask exactly 3 follow-up questions, ONE at a time. Wait for the user to answer each question before asking the next. Questions should cover:
   - What are the risks if this goes wrong?
   - Are there deadlines, constraints, or budget considerations?
   - Who else is affected by this decision?

3. ONLY after you have asked all 3 questions AND received all 3 answers, call the end_intake tool. Do NOT call end_intake before asking and receiving answers to all 3 questions. The user stating their decision does NOT count as an answer.

4. NEVER call end_intake early. If you are unsure whether you have enough information, ask another question instead of calling end_intake.`;

const JUDGE_FIRST_MESSAGE =
  "The court is now in session. Please state the decision you are considering.";

type LobbyPhase = "idle" | "speaking" | "ready";

export default function LobbyPage() {
  return (
    <ConversationProvider>
      <LobbyContent />
    </ConversationProvider>
  );
}

function LobbyContent() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [greeting, setGreeting] = useState("");
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<LobbyPhase>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track message counts to handle the greeting correctly
  const agentMsgCount = useRef(0);
  const userMsgCount = useRef(0);
  const clarificationsRef = useRef(clarifications);
  clarificationsRef.current = clarifications;

  const handleAgentResponse = useCallback((text: string) => {
    agentMsgCount.current++;
    // First agent message is the greeting — show it but don't add as clarification
    if (agentMsgCount.current === 1) {
      setGreeting(text);
      return;
    }

    setClarifications((prev) => [
      ...prev,
      { question: text, answer: "", index: prev.length + 1 },
    ]);
  }, []);

  const handleUserTranscript = useCallback((text: string) => {
    userMsgCount.current++;

    // First user message is always the case statement
    if (userMsgCount.current === 1) {
      setTranscript(text);
      return;
    }

    // Subsequent messages → answer the latest unanswered clarification
    setClarifications((prev) => {
      const updated = [...prev];
      const unansweredIdx = updated.findIndex((c) => !c.answer);
      if (unansweredIdx !== -1) {
        updated[unansweredIdx] = { ...updated[unansweredIdx], answer: text };
      }
      return updated;
    });
  }, []);

  // Client tool: the Judge calls this when intake is complete
  const clientTools = useMemo(
    () => ({
      end_intake: async () => {
        // Delay phase change so pending onMessage callbacks can fire
        setTimeout(() => setPhase("ready"), 1500);
        return "Intake complete. Session ending.";
      },
    }),
    [],
  );

  const handleDisconnect = useCallback(() => {
    setPhase((prev) => (prev === "ready" ? "ready" : "idle"));
  }, []);

  const { status, isSpeaking, endSession } = useConvAI({
    enabled: phase === "speaking",
    prompt: JUDGE_PROMPT,
    firstMessage: JUDGE_FIRST_MESSAGE,
    clientTools,
    onAgentResponse: handleAgentResponse,
    onUserTranscript: handleUserTranscript,
    onDisconnect: handleDisconnect,
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
          {greeting && (
            <div className="flex items-start gap-2">
              <AgentBadge role="judge" className="shrink-0 mt-0.5" />
              <p className="text-sm">{greeting}</p>
            </div>
          )}

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
          {phase === "ready" ? (
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-sm font-medium text-foreground">
                {transcript
                  ? "The court has enough information."
                  : "Session ended. Tap the mic to try again."}
              </p>
              {transcript ? (
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
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPhase("idle");
                  setTranscript("");
                  setGreeting("");
                  setClarifications([]);
                  agentMsgCount.current = 0;
                  userMsgCount.current = 0;
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Start over
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <MicButton
                  size={phase === "idle" ? "lg" : "default"}
                  isRecording={isSessionLive}
                  onPress={handleMicToggle}
                  onRelease={() => {}}
                />

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
                    : "Tap the mic to begin"}
              </p>

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
