"use client";

import { useReducer, useCallback } from "react";
import type {
  AgentRole,
  Argument,
  Clarification,
  DebateEvent,
  SessionStatus,
  Verdict,
} from "@/src/types";

interface PendingSpeaking {
  argument: Argument;
  audioBase64: string;
}

interface DebateState {
  status: SessionStatus;
  clarifications: Clarification[];
  /** Arguments that have been revealed (audio started playing) */
  arguments: Argument[];
  /** Buffered speaking events waiting for playback turn */
  pendingSpeaking: PendingSpeaking[];
  speakingRole: AgentRole | null;
  verdict: Verdict | null;
  error: string | null;
}

type DebateAction =
  | { type: "EVENT"; event: DebateEvent }
  | { type: "REVEAL_NEXT" }
  | { type: "RESET" };

const INITIAL_STATE: DebateState = {
  status: "intake",
  clarifications: [],
  arguments: [],
  pendingSpeaking: [],
  speakingRole: null,
  verdict: null,
  error: null,
};

function debateReducer(state: DebateState, action: DebateAction): DebateState {
  switch (action.type) {
    case "RESET":
      return INITIAL_STATE;

    case "REVEAL_NEXT": {
      if (state.pendingSpeaking.length === 0) {
        return { ...state, speakingRole: null };
      }
      const [next, ...rest] = state.pendingSpeaking;
      return {
        ...state,
        arguments: [...state.arguments, next.argument],
        pendingSpeaking: rest,
        speakingRole: next.argument.role,
      };
    }

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
        case "speaking": {
          const pending: PendingSpeaking = {
            argument: event.data,
            audioBase64: event.audioBase64,
          };
          return {
            ...state,
            pendingSpeaking: [...state.pendingSpeaking, pending],
          };
        }
        case "audio":
          return state;
        case "user_response":
          return state;
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

export function useDebateFeed() {
  const [state, dispatch] = useReducer(debateReducer, INITIAL_STATE);

  const handleEvent = useCallback((event: DebateEvent) => {
    dispatch({ type: "EVENT", event });
  }, []);

  const revealNext = useCallback(() => {
    dispatch({ type: "REVEAL_NEXT" });
  }, []);

  return { ...state, handleEvent, revealNext };
}
