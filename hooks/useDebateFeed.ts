"use client";

import { useEffect, useRef, useReducer, useCallback } from "react";
import type {
  AgentRole,
  Argument,
  Clarification,
  DebateEvent,
  SessionStatus,
  Verdict,
} from "@/src/types";

interface DebateState {
  status: SessionStatus;
  clarifications: Clarification[];
  arguments: Argument[];
  speakingRole: AgentRole | null;
  verdict: Verdict | null;
  audioQueue: { role: AgentRole; audioBase64: string }[];
  error: string | null;
}

type DebateAction =
  | { type: "EVENT"; event: DebateEvent }
  | { type: "AUDIO_PLAYED" }
  | { type: "RESET" };

const INITIAL_STATE: DebateState = {
  status: "intake",
  clarifications: [],
  arguments: [],
  speakingRole: null,
  verdict: null,
  audioQueue: [],
  error: null,
};

function debateReducer(state: DebateState, action: DebateAction): DebateState {
  switch (action.type) {
    case "RESET":
      return INITIAL_STATE;

    case "AUDIO_PLAYED":
      return {
        ...state,
        audioQueue: state.audioQueue.slice(1),
        speakingRole:
          state.audioQueue.length > 1 ? state.audioQueue[1].role : null,
      };

    case "EVENT": {
      const { event } = action;
      switch (event.type) {
        case "status_change":
          return { ...state, status: event.status };
        case "clarification":
          return {
            ...state,
            clarifications: [...state.clarifications, event.data],
          };
        case "argument":
          return {
            ...state,
            arguments: [...state.arguments, event.data],
          };
        case "speaking":
          return {
            ...state,
            arguments: [...state.arguments, event.data],
            audioQueue: [
              ...state.audioQueue,
              { role: event.data.role, audioBase64: event.audioBase64 },
            ],
            speakingRole: state.speakingRole ?? event.data.role,
          };
        case "audio":
          return {
            ...state,
            audioQueue: [
              ...state.audioQueue,
              { role: event.role, audioBase64: event.audioBase64 },
            ],
            speakingRole: state.speakingRole ?? event.role,
          };
        case "user_response":
          return state; // handled by cross-exam dialog
        case "verdict":
          return { ...state, verdict: event.data };
        case "error":
          return { ...state, error: event.message };
        default:
          return state;
      }
    }

    default:
      return state;
  }
}

interface UseDebateFeedOptions {
  caseId: string | null;
}

export function useDebateFeed({ caseId }: UseDebateFeedOptions) {
  const [state, dispatch] = useReducer(debateReducer, INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!caseId) return;

    dispatch({ type: "RESET" });

    const url = `/api/cases/${caseId}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(event.data) as DebateEvent;
        dispatch({ type: "EVENT", event: parsed });
      } catch {
        // ignore malformed events
      }
    });

    es.addEventListener("error", () => {
      // EventSource auto-reconnects on error
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [caseId]);

  const handleEvent = useCallback((event: DebateEvent) => {
    dispatch({ type: "EVENT", event });
  }, []);

  const markAudioPlayed = useCallback(() => {
    dispatch({ type: "AUDIO_PLAYED" });
  }, []);

  return { ...state, handleEvent, markAudioPlayed };
}
