"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentRole } from "@/src/types";

interface QueuedAudio {
  role: AgentRole;
  audioBase64: string;
}

interface UseAudioPlayerOptions {
  /** Called when playback of an item finishes */
  onItemPlayed?: () => void;
}

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRole, setCurrentRole] = useState<AgentRole | null>(null);
  const queueRef = useRef<QueuedAudio[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const onItemPlayedRef = useRef(options?.onItemPlayed);
  onItemPlayedRef.current = options?.onItemPlayed;

  // Play next item in the queue
  const playNext = useCallback(() => {
    if (playingRef.current || queueRef.current.length === 0) return;

    const item = queueRef.current[0];
    playingRef.current = true;
    setIsPlaying(true);
    setCurrentRole(item.role);

    const audio = new Audio(`data:audio/mpeg;base64,${item.audioBase64}`);
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      playingRef.current = false;
      queueRef.current.shift();
      setIsPlaying(false);
      setCurrentRole(null);
      onItemPlayedRef.current?.();

      // Play next in queue
      if (queueRef.current.length > 0) {
        // Small delay between speakers
        setTimeout(playNext, 300);
      }
    });

    audio.addEventListener("error", () => {
      playingRef.current = false;
      queueRef.current.shift();
      setIsPlaying(false);
      setCurrentRole(null);
      onItemPlayedRef.current?.();

      // Try next item
      if (queueRef.current.length > 0) {
        setTimeout(playNext, 100);
      }
    });

    audio.play().catch(() => {
      // Autoplay blocked — skip this item
      playingRef.current = false;
      queueRef.current.shift();
      setIsPlaying(false);
      setCurrentRole(null);
    });
  }, []);

  // Enqueue audio for playback
  const enqueue = useCallback(
    (role: AgentRole, audioBase64: string) => {
      queueRef.current.push({ role, audioBase64 });
      if (!playingRef.current) {
        playNext();
      }
    },
    [playNext],
  );

  // Stop playback and clear queue
  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    queueRef.current = [];
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentRole(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return {
    isPlaying,
    currentRole,
    queueLength: queueRef.current.length,
    enqueue,
    stop,
  };
}
