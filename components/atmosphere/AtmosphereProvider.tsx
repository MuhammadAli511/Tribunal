"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MoodConfig, MoodName } from "./types";
import { MOODS } from "./moods";

interface AtmosphereContextValue {
  mood: MoodConfig;
  moodName: MoodName;
  /** Flash intensity (0 = none, 0.06 = normal, 0.09 = strong) */
  flash: number;
  /** Whether a dim-then-brighten transition should fire */
  dim: boolean;
  setMood: (name: MoodName, withFlash?: boolean, withDim?: boolean) => void;
  clearFlash: () => void;
  clearDim: () => void;
}

const AtmosphereContext = createContext<AtmosphereContextValue | null>(null);

export function AtmosphereProvider({ children }: { children: ReactNode }) {
  const [moodName, setMoodName] = useState<MoodName>("landing");
  const [flash, setFlash] = useState(0);
  const [dim, setDim] = useState(false);
  const prevMood = useRef<MoodName>("landing");

  const setMood = useCallback((name: MoodName, withFlash = false, withDim = false) => {
    if (name === prevMood.current) return;
    prevMood.current = name;

    if (withDim) setDim(true);

    // Verdict gets a dramatic pause: flash, then delay the mood shift
    if (name === "courtroom-verdict") {
      setFlash(0.06);
      setTimeout(() => setMoodName(name), 500);
      return;
    }

    // Cross-exam gets a stronger flash
    if (name === "courtroom-crossexam") {
      setFlash(0.09);
    } else if (withFlash) {
      setFlash(0.06);
    }

    setMoodName(name);
  }, []);

  const clearFlash = useCallback(() => setFlash(0), []);
  const clearDim = useCallback(() => setDim(false), []);

  return (
    <AtmosphereContext.Provider
      value={{
        mood: MOODS[moodName],
        moodName,
        flash,
        dim,
        setMood,
        clearFlash,
        clearDim,
      }}
    >
      {children}
    </AtmosphereContext.Provider>
  );
}

export function useAtmosphere(): AtmosphereContextValue {
  const ctx = useContext(AtmosphereContext);
  if (!ctx) {
    throw new Error("useAtmosphere must be used within AtmosphereProvider");
  }
  return ctx;
}
