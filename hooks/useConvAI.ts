"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseConvAIOptions {
  /** Whether the session should be active */
  enabled: boolean;
  /** Custom system prompt for the Judge agent */
  prompt?: string;
  /** First message the Judge speaks */
  firstMessage?: string;
  /** Called when the agent speaks (full message) */
  onAgentResponse?: (text: string) => void;
  /** Called when the user's speech is transcribed (full message) */
  onUserTranscript?: (text: string) => void;
}

type ConvAIStatus = "idle" | "connecting" | "connected" | "error";

export function useConvAI({
  enabled,
  prompt,
  firstMessage,
  onAgentResponse,
  onUserTranscript,
}: UseConvAIOptions) {
  const [status, setStatus] = useState<ConvAIStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const onAgentRef = useRef(onAgentResponse);
  const onUserRef = useRef(onUserTranscript);
  onAgentRef.current = onAgentResponse;
  onUserRef.current = onUserTranscript;

  const overrides = prompt
    ? {
        agent: {
          prompt: { prompt },
          language: "en" as const,
          ...(firstMessage ? { firstMessage } : {}),
        },
      }
    : undefined;

  const conversation = useConversation({
    overrides,
    onConnect: () => {
      setStatus("connected");
      setConnectionError(null);
    },
    onDisconnect: () => {
      setStatus("idle");
      startedRef.current = false;
    },
    onError: (message: string) => {
      console.error("ConvAI error:", message);
      setConnectionError(message);
      setStatus("error");
    },
    onMessage: (message) => {
      if (message.role === "agent") {
        onAgentRef.current?.(message.message);
      } else {
        onUserRef.current?.(message.message);
      }
    },
  });

  const startSession = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      setStatus("connecting");
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (!agentId) {
        throw new Error("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set");
      }

      await conversation.startSession({
        agentId,
        connectionType: "webrtc",
      });
    } catch (err) {
      startedRef.current = false;
      setStatus("error");
      setConnectionError(
        err instanceof Error ? err.message : "Failed to start session",
      );
    }
  }, [conversation]);

  const endSession = useCallback(async () => {
    await conversation.endSession();
    startedRef.current = false;
  }, [conversation]);

  // Auto-start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startSession();
    } else if (startedRef.current) {
      endSession();
    }
  }, [enabled, startSession, endSession]);

  return {
    status,
    connectionError,
    isSpeaking: conversation.isSpeaking,
    startSession,
    endSession,
  };
}
