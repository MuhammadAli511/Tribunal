"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DebateEvent } from "@/src/types";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface UseCaseSessionOptions {
  caseId: string | null;
  onEvent?: (event: DebateEvent) => void;
}

export function useCaseSession({ caseId, onEvent }: UseCaseSessionOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Connect / disconnect lifecycle
  useEffect(() => {
    if (!caseId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/cases/${caseId}/ws`;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setStatus("connected");
    });

    ws.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as DebateEvent;
        onEventRef.current?.(parsed);
      } catch {
        // ignore non-JSON messages (e.g. pong)
      }
    });

    ws.addEventListener("close", () => {
      setStatus("disconnected");
    });

    ws.addEventListener("error", () => {
      setStatus("disconnected");
    });

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [caseId]);

  // Send a JSON message to the WebSocket
  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}
