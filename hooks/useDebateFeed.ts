"use client";

import { useReducer, useCallback } from "react";
import type {
  AgentRole,
  Argument,
  Clarification,
  DebateEvent,
  JuryVerdict,
  SessionStatus,
  Verdict,
} from "@/src/types";

interface PendingSpeaking {
  argument: Argument;
  audioBase64: string;
}

interface SentimentScore {
  role: AgentRole;
  score: number;
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
  /** Verdict received from backend but not yet shown (waiting for TTS to drain) */
  pendingVerdict: Verdict | null;
  juryVerdict: JuryVerdict | null;
  /** Revealed sentiment scores (synced with audio playback) */
  sentimentScores: SentimentScore[];
  /** Buffered sentiment scores waiting to be revealed with their argument */
  pendingSentiment: SentimentScore[];
  error: string | null;
}

type DebateAction =
  | { type: "EVENT"; event: DebateEvent }
  | { type: "REVEAL_NEXT" }
  | { type: "FLUSH_VERDICT" }
  | { type: "RESET" };

const INITIAL_STATE: DebateState = {
  status: "intake",
  clarifications: [],
  arguments: [],
  pendingSpeaking: [],
  speakingRole: null,
  verdict: null,
  pendingVerdict: null,
  juryVerdict: null,
  sentimentScores: [],
  pendingSentiment: [],
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
      // Flush any buffered sentiment for this role
      const matchIdx = state.pendingSentiment.findIndex((s) => s.role === next.argument.role);
      const revealedSentiment = matchIdx >= 0 ? [state.pendingSentiment[matchIdx]] : [];
      const remainingSentiment = matchIdx >= 0
        ? [...state.pendingSentiment.slice(0, matchIdx), ...state.pendingSentiment.slice(matchIdx + 1)]
        : state.pendingSentiment;
      return {
        ...state,
        arguments: [...state.arguments, next.argument],
        pendingSpeaking: rest,
        speakingRole: next.argument.role,
        sentimentScores: [...state.sentimentScores, ...revealedSentiment],
        pendingSentiment: remainingSentiment,
      };
    }

    case "FLUSH_VERDICT": {
      if (!state.pendingVerdict) return state;
      return {
        ...state,
        verdict: state.pendingVerdict,
        pendingVerdict: null,
        status: "verdict",
      };
    }

    case "EVENT": {
      const { event } = action;
      switch (event.type) {
        case "status_change":
          // Don't immediately show "verdict" status — wait for TTS queue to drain
          if (event.status === "verdict") return state;
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
            // Resume "debating" status if we were deliberating
            status: state.status === "deliberating" ? "debating" : state.status,
            pendingSpeaking: [...state.pendingSpeaking, pending],
          };
        }
        case "audio":
          return state;
        case "user_response":
          return state;
        case "verdict":
          // Buffer the verdict — don't apply until TTS playback is complete
          return { ...state, pendingVerdict: event.data };
        case "jury_verdict":
          return { ...state, juryVerdict: event.data };
        case "sentiment":
          // Buffer sentiment — it gets revealed when the matching argument's audio plays
          return {
            ...state,
            pendingSentiment: [...state.pendingSentiment, { role: event.role, score: event.score }],
          };
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

  const flushVerdict = useCallback(() => {
    dispatch({ type: "FLUSH_VERDICT" });
  }, []);

  return { ...state, handleEvent, revealNext, flushVerdict };
}
