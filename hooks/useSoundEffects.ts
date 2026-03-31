"use client";

import { useCallback, useEffect, useRef } from "react";

type SoundName = "gavel" | "ambiance" | "verdict";

const SOUND_MAP: Record<SoundName, { src: string; loop: boolean; volume: number }> = {
  gavel: { src: "/sounds/gavel.mp3", loop: false, volume: 0.5 },
  ambiance: { src: "/sounds/ambiance.mp3", loop: true, volume: 0.15 },
  verdict: { src: "/sounds/verdict-sting.mp3", loop: false, volume: 0.6 },
};

export function useSoundEffects() {
  const audioMap = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  useEffect(() => {
    for (const [name, config] of Object.entries(SOUND_MAP) as [SoundName, typeof SOUND_MAP[SoundName]][]) {
      const audio = new Audio(config.src);
      audio.loop = config.loop;
      audio.volume = config.volume;
      audio.preload = "auto";
      audioMap.current.set(name, audio);
    }

    return () => {
      for (const audio of audioMap.current.values()) {
        audio.pause();
        audio.src = "";
      }
      audioMap.current.clear();
    };
  }, []);

  const play = useCallback((name: SoundName) => {
    const audio = audioMap.current.get(name);
    if (!audio) return;
    if (!audio.loop) {
      audio.currentTime = 0;
    }
    audio.play().catch(() => {});
  }, []);

  const stop = useCallback((name: SoundName) => {
    const audio = audioMap.current.get(name);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  return { play, stop };
}
