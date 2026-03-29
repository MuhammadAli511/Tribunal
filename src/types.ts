// ── Agent Roles ──────────────────────────────────────────────────────────────

export const AGENT_ROLES = [
  "judge",
  "prosecutor",
  "defender",
  "domain-expert",
  "historian",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

// ── Case Intake ──────────────────────────────────────────────────────────────

export interface CaseBrief {
  /** Raw transcription of the user's spoken decision */
  text: string;
  /** When the brief was submitted */
  createdAt: string;
}

export interface Clarification {
  /** The Judge's clarifying question */
  question: string;
  /** The user's spoken answer (transcribed) */
  answer: string;
  /** Sequence number (1-3) */
  index: number;
}

// ── Debate ───────────────────────────────────────────────────────────────────

export interface Argument {
  id: string;
  /** Which agent produced this argument */
  role: AgentRole;
  /** Debate round (1-based) */
  round: number;
  /** The argument text */
  text: string;
  /** If this is a rebuttal, the id of the argument it targets */
  rebuttalTargetId?: string;
  createdAt: string;
}

export interface DebateRound {
  round: number;
  arguments: Argument[];
  /** User's response during cross-examination (if any this round) */
  userResponse?: string;
}

// ── Verdict ──────────────────────────────────────────────────────────────────

export type Ruling = "proceed" | "do-not-proceed" | "conditional";

export interface Verdict {
  ruling: Ruling;
  /** The 2-3 arguments or facts that decided the ruling */
  keyFactors: string[];
  /** What would need to be true for the ruling to change */
  conditions: string[];
  /** What the losing side got right */
  dissent: string;
  createdAt: string;
}

// ── Case Record (full case lifecycle) ────────────────────────────────────────

export type SessionStatus =
  | "intake"
  | "debating"
  | "cross-exam"
  | "deliberating"
  | "verdict";

export interface CaseRecord {
  id: string;
  brief: CaseBrief;
  clarifications: Clarification[];
  rounds: DebateRound[];
  verdict?: Verdict;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

// ── SSE / WebSocket Events ───────────────────────────────────────────────────

export type DebateEvent =
  | { type: "status_change"; status: SessionStatus }
  | { type: "clarification"; data: Clarification }
  | { type: "argument"; data: Argument }
  | { type: "speaking"; data: Argument; audioBase64: string }
  | { type: "audio"; role: AgentRole; audioBase64: string }
  | { type: "user_response"; round: number; text: string }
  | { type: "verdict"; data: Verdict }
  | { type: "error"; message: string };

// ── Historian-specific ───────────────────────────────────────────────────────

export interface CaseSummary {
  caseId: string;
  briefSnippet: string;
  ruling: Ruling;
  /** Short summary of the case and outcome */
  summary: string;
  createdAt: string;
}

export interface DetectedPattern {
  id: string;
  /** Human-readable pattern description */
  description: string;
  /** Case IDs that contributed to this pattern */
  caseIds: string[];
  detectedAt: string;
}
