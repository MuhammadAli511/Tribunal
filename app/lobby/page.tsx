"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider } from "@elevenlabs/react";
import { MicButton } from "@/components/shared/MicButton";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { AudioWaveform } from "@/components/court/AudioWaveform";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConvAI } from "@/hooks/useConvAI";
import { MicOff } from "lucide-react";
import type { Clarification, TemplateId } from "@/src/types";
import { useAtmosphere } from "@/components/atmosphere/AtmosphereProvider";
import { TemplateGrid } from "@/components/court/TemplateGrid";
import { getTemplate } from "@/lib/templates";

const CLERK_FIRST_MESSAGE =
  "Good day. I'll be gathering the details of your case before it goes to the court. Please state the decision you are considering.";

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
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setMood } = useAtmosphere();

  const clerkPrompt = useMemo(() => {
    const base = `You are the Court Clerk in a decision tribunal. Your role is to gather all the necessary information and facts about a decision someone is considering before the case goes to trial.

IMPORTANT RULES — follow them in strict order:

1. WAIT for the user to state their decision. Accept it as-is. Do NOT restate or clarify it.

2. You MUST ask exactly 3 follow-up questions, ONE at a time. Wait for the user to answer each question before asking the next. Questions should cover:
   - What are the risks if this goes wrong?
   - Are there deadlines, constraints, or budget considerations?
   - Who else is affected by this decision?

3. ONLY after you have asked all 3 questions AND received all 3 answers, call the end_intake tool. Do NOT call end_intake before asking and receiving answers to all 3 questions. The user stating their decision does NOT count as an answer.

4. NEVER call end_intake early. If you are unsure whether you have enough information, ask another question instead of calling end_intake.`;

    const template = templateId ? getTemplate(templateId) : null;
    if (template?.systemPromptModifier) {
      return base + "\n\n" + template.systemPromptModifier;
    }
    return base;
  }, [templateId]);

  useEffect(() => {
    setMood(phase === "speaking" ? "lobby-recording" : "lobby");
  }, [phase, setMood]);

  const agentMsgCount = useRef(0);
  const userMsgCount = useRef(0);
  const clarificationsRef = useRef(clarifications);
  clarificationsRef.current = clarifications;

  const handleAgentResponse = useCallback((text: string) => {
    agentMsgCount.current++;
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
    if (userMsgCount.current === 1) {
      setTranscript(text);
      return;
    }
    setClarifications((prev) => {
      const updated = [...prev];
      const unansweredIdx = updated.findIndex((c) => !c.answer);
      if (unansweredIdx !== -1) {
        updated[unansweredIdx] = { ...updated[unansweredIdx], answer: text };
      }
      return updated;
    });
  }, []);

  const intakeDoneRef = useRef(false);

  const clientTools = useMemo(
    () => ({
      end_intake: async () => {
        intakeDoneRef.current = true;
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
    prompt: clerkPrompt,
    firstMessage: CLERK_FIRST_MESSAGE,
    clientTools,
    onAgentResponse: handleAgentResponse,
    onUserTranscript: handleUserTranscript,
    onDisconnect: handleDisconnect,
  });

  // When end_intake is called, wait for the judge to finish speaking before transitioning
  useEffect(() => {
    if (intakeDoneRef.current && !isSpeaking) {
      intakeDoneRef.current = false;
      setPhase("ready");
      endSession();
    }
  }, [isSpeaking, endSession]);

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
        body: JSON.stringify({ text: transcript, templateId: templateId ?? "freeform" }),
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
    <div className="flex h-svh flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#1f1e1b] px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚖️</span>
          <span className="text-[13px] font-semibold text-[#ede9e1]">Tribunal</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2826] px-2.5 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4ead6b]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#a39e93]">
            Intake
          </span>
        </span>
      </div>

      {/* Judge avatar section */}
      <div className="shrink-0 pt-8 text-center">
        <AgentAvatar role="judge" size="lg" state={isSpeaking ? "speaking" : "idle"} className="mx-auto" />
        <p className="mt-3 text-base font-semibold text-[#ede9e1]">The Clerk</p>
        <p className="text-[11px] text-[#7a756c]">is gathering facts</p>
      </div>

      {/* Scrollable transcript */}
      <ScrollArea className="min-h-0 flex-1 px-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6">
          {greeting && (
            <div className="rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4">
              <div className="mb-2 flex items-center gap-2">
                <AgentAvatar role="judge" size="sm" />
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                  Clerk
                </span>
              </div>
              <p className="pl-7 text-[12px] leading-relaxed text-[#a39e93]">
                {greeting}
              </p>
            </div>
          )}

          {transcript && (
            <div className="rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2a2826]">
                  <div className="h-2 w-2 rounded-full bg-[#7a756c]" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                  You
                </span>
              </div>
              <p className="pl-7 text-[12px] leading-relaxed text-[#ede9e1]">
                {transcript}
              </p>
            </div>
          )}

          {clarifications.map((c, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AgentAvatar role="judge" size="sm" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                    Clerk
                  </span>
                </div>
                <p className="pl-7 text-[12px] leading-relaxed text-[#a39e93]">
                  {c.question}
                </p>
              </div>
              {c.answer && (
                <div className="rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2a2826]">
                      <div className="h-2 w-2 rounded-full bg-[#7a756c]" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                      You
                    </span>
                  </div>
                  <p className="pl-7 text-[12px] leading-relaxed text-[#ede9e1]">
                    {c.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Bottom controls */}
      <div className="shrink-0 border-t border-[#1f1e1b] bg-[#0a0a08]/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-4">
          {phase === "ready" ? (
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-[13px] font-medium text-[#ede9e1]">
                {transcript
                  ? "The court has enough information."
                  : "Session ended. Tap the mic to try again."}
              </p>
              {transcript ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#ede9e1] py-2.5 text-[13px] font-semibold text-[#121210] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {isSubmitting
                    ? "Submitting to the Court..."
                    : "Submit to the Court"}
                </button>
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
                  setTemplateId(null);
                }}
                className="text-[11px] text-[#52504a] transition-colors hover:text-[#a39e93]"
              >
                Start over
              </button>
            </div>
          ) : (
            phase === "idle" && !templateId ? (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-[11px] text-[#7a756c]">Choose a case type to begin</p>
                <TemplateGrid
                  selected={templateId}
                  onSelect={(id) => setTemplateId(id)}
                  className="w-full"
                />
                <button
                  type="button"
                  onClick={() => setTemplateId("freeform")}
                  className="text-[10px] text-[#52504a] transition-colors hover:text-[#a39e93]"
                >
                  or skip and speak freely
                </button>
              </div>
            ) : (
              <>
                <AudioWaveform
                  isActive={isSpeaking}
                  barCount={7}
                  className="h-5 text-[#5b8def]"
                />
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
                      className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#2a2826] bg-[#1a1917] text-[#7a756c] transition-colors hover:border-[#e35d5d]/50 hover:text-[#e35d5d]"
                      title="End session"
                    >
                      <MicOff className="h-6 w-6" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#7a756c]">
                  {status === "connecting"
                    ? "Connecting to the Clerk..."
                    : isSessionLive
                      ? isSpeaking
                        ? "The Clerk is speaking..."
                        : "Listening — speak your decision"
                      : "Tap the mic to begin"}
                </p>
                {transcript && phase === "speaking" && (
                  <button
                    onClick={() => setPhase("ready")}
                    className="w-full rounded-lg border border-[#2a2826] py-2 text-[12px] text-[#7a756c] transition-colors hover:border-[#7a756c] hover:text-[#a39e93]"
                  >
                    Done speaking — submit case
                  </button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
