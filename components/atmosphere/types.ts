export interface MoodConfig {
  /** Multiplier on max 50 particles (0.2 - 1.0) */
  particleDensity: number;
  /** Drift speed in px/frame (0.1 - 0.5) */
  particleSpeed: number;
  /** Light ray opacity (0.02 - 0.12) */
  rayOpacity: number;
  /** Light ray RGB color */
  rayColor: [number, number, number];
  /** Fog height as fraction of viewport (0.05 - 0.2) */
  fogHeight: number;
  /** Fog opacity (0.4 - 1.0) */
  fogOpacity: number;
  /** Subtle background tint RGB */
  bgTint: [number, number, number];
}

export interface Particle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  /** Per-particle phase offset for opacity oscillation */
  phase: number;
  /** Drift direction in radians */
  angle: number;
  speed: number;
}

export type MoodName =
  | "landing"
  | "lobby"
  | "lobby-recording"
  | "courtroom-intake"
  | "courtroom-debating"
  | "courtroom-crossexam"
  | "courtroom-deliberating"
  | "courtroom-verdict"
  | "verdict"
  | "history";
