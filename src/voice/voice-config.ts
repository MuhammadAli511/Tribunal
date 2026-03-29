import type { AgentRole } from "../types";

export interface VoiceSettings {
  voiceId: string;
  /** 0-1. Lower = more variable/expressive, higher = more stable */
  stability: number;
  /** 0-1. Higher = closer to original voice sample */
  similarityBoost: number;
  /** Optional model override (defaults to eleven_flash_v2_5) */
  modelId?: string;
}

export const VOICE_CONFIG: Record<AgentRole, VoiceSettings> = {
  judge: {
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel — Steady Broadcaster
    stability: 0.8,
    similarityBoost: 0.75,
  },
  prosecutor: {
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam — Dominant, Firm
    stability: 0.45,
    similarityBoost: 0.8,
  },
  defender: {
    voiceId: "cjVigY5qzO86Huf0OWal", // Eric — Smooth, Trustworthy
    stability: 0.7,
    similarityBoost: 0.75,
  },
  "domain-expert": {
    voiceId: "Xb7hH8MSUJpSbSDYk0k2", // Alice — Clear, Engaging Educator
    stability: 0.75,
    similarityBoost: 0.8,
  },
  historian: {
    voiceId: "N2lVS1w4EtoT3dr4eOWO", // Callum — Husky Trickster
    stability: 0.6,
    similarityBoost: 0.7,
  },
};

/** Display labels for UI */
export const AGENT_LABELS: Record<AgentRole, string> = {
  judge: "The Judge",
  prosecutor: "The Prosecutor",
  defender: "The Defender",
  "domain-expert": "The Domain Expert",
  historian: "The Historian",
};
