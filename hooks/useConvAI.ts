"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

type ClientToolHandler = (parameters: Record<string, unknown>) => Promise<string | void> | string | void;

interface UseConvAIOptions {
  enabled: boolean;
  prompt?: string;
  firstMessage?: string;
  /** Client-side tools the agent can invoke */
  clientTools?: Record<string, ClientToolHandler>;
  onAgentResponse?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onDisconnect?: () => void;
}

export function useConvAI({
  enabled,
  prompt,
  firstMessage,
  clientTools,
  onAgentResponse,
  onUserTranscript,
  onDisconnect: onDisconnectProp,
}: UseConvAIOptions) {
  const startedRef = useRef(false);
  const onAgentRef = useRef(onAgentResponse);
  const onUserRef = useRef(onUserTranscript);
  const onDisconnectRef = useRef(onDisconnectProp);
  onAgentRef.current = onAgentResponse;
  onUserRef.current = onUserTranscript;
  onDisconnectRef.current = onDisconnectProp;

  const overrides = prompt
    ? {
        agent: {
          prompt: { prompt },
          firstMessage: firstMessage ?? undefined,
          language: "en" as const,
        },
      }
    : undefined;

  const conversation = useConversation({
    overrides,
    clientTools,
    onConnect: () => {
      console.log("[ConvAI] connected");
    },
    onDisconnect: () => {
      console.log("[ConvAI] disconnected");
      startedRef.current = false;
      onDisconnectRef.current?.();
    },
    onError: (error) => {
      console.error("[ConvAI] error:", error);
    },
    onMessage: (message) => {
      console.log("[ConvAI] message:", message.role, message.message);
      if (message.role === "agent") {
        onAgentRef.current?.(message.message);
      } else if (message.role === "user") {
        onUserRef.current?.(message.message);
      }
    },
  });

  const startSession = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (!agentId) {
        throw new Error("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set");
      }

      await conversation.startSession({ agentId });
    } catch (err) {
      startedRef.current = false;
      console.error("[ConvAI] start failed:", err);
    }
  }, [conversation]);

  const endSession = useCallback(async () => {
    await conversation.endSession();
    startedRef.current = false;
  }, [conversation]);

  useEffect(() => {
    if (enabled) {
      startSession();
    } else if (startedRef.current) {
      endSession();
    }
  }, [enabled, startSession, endSession]);

  return {
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    startSession,
    endSession,
  };
}
