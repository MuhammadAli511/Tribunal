import { CASE_SCHEMA } from "./schema";
import type {
  AgentRole,
  Argument,
  CaseBrief,
  CaseRecord,
  Clarification,
  DebateRound,
  JuryVote,
  JuryVoteValue,
  JuryVerdict,
  Ruling,
  SessionStatus,
  Verdict,
} from "../types";

// ── Row types returned by SQLite queries ─────────────────────────────────────

type BriefRow = {
  id: string;
  text: string;
  created_at: string;
  [k: string]: SqlStorageValue;
};

type ClarificationRow = {
  id: string;
  idx: number;
  question: string;
  answer: string;
  created_at: string;
  [k: string]: SqlStorageValue;
};

type ArgumentRow = {
  id: string;
  role: string;
  round: number;
  text: string;
  rebuttal_target_id: string | null;
  created_at: string;
  [k: string]: SqlStorageValue;
};

type UserResponseRow = {
  round: number;
  text: string;
  [k: string]: SqlStorageValue;
};

type VerdictRow = {
  id: string;
  ruling: string;
  key_factors: string;
  conditions: string;
  dissent: string;
  created_at: string;
  [k: string]: SqlStorageValue;
};

type StateRow = {
  key: string;
  value: string;
  [k: string]: SqlStorageValue;
};

type JuryVoteRow = {
  id: string;
  name: string;
  persona: string;
  vote: string;
  rationale: string;
  created_at: string;
  [k: string]: SqlStorageValue;
};

/**
 * SQLite helper for a single CaseDO instance.
 * Wraps `ctx.storage.sql` with typed CRUD operations.
 */
export class CaseStore {
  constructor(private sql: SqlStorage) {}

  /** Create all tables (idempotent). */
  initSchema(): void {
    this.sql.exec(CASE_SCHEMA);
  }

  // ── Brief ──────────────────────────────────────────────────────────────────

  saveBrief(text: string): string {
    const row = this.sql
      .exec<BriefRow>("INSERT INTO case_briefs (text) VALUES (?) RETURNING *", text)
      .one();
    return row.id;
  }

  getBrief(): CaseBrief | null {
    const rows = this.sql.exec<BriefRow>("SELECT * FROM case_briefs LIMIT 1").toArray();
    if (rows.length === 0) return null;
    return { text: rows[0].text, createdAt: rows[0].created_at };
  }

  // ── Clarifications ─────────────────────────────────────────────────────────

  saveClarification(index: number, question: string, answer: string): void {
    this.sql.exec(
      "INSERT INTO clarifications (idx, question, answer) VALUES (?, ?, ?)",
      index,
      question,
      answer,
    );
  }

  getClarifications(): Clarification[] {
    return this.sql
      .exec<ClarificationRow>("SELECT * FROM clarifications ORDER BY idx")
      .toArray()
      .map((r) => ({
        question: r.question,
        answer: r.answer,
        index: r.idx,
      }));
  }

  // ── Arguments ──────────────────────────────────────────────────────────────

  saveArgument(arg: Omit<Argument, "id" | "createdAt">): Argument {
    const row = this.sql
      .exec<ArgumentRow>(
        "INSERT INTO arguments (role, round, text, rebuttal_target_id) VALUES (?, ?, ?, ?) RETURNING *",
        arg.role,
        arg.round,
        arg.text,
        arg.rebuttalTargetId ?? null,
      )
      .one();
    return toArgument(row);
  }

  getArgumentsByRound(round: number): Argument[] {
    return this.sql
      .exec<ArgumentRow>("SELECT * FROM arguments WHERE round = ? ORDER BY created_at", round)
      .toArray()
      .map(toArgument);
  }

  getAllArguments(): Argument[] {
    return this.sql
      .exec<ArgumentRow>("SELECT * FROM arguments ORDER BY round, created_at")
      .toArray()
      .map(toArgument);
  }

  // ── User Responses ─────────────────────────────────────────────────────────

  saveUserResponse(round: number, text: string): void {
    this.sql.exec("INSERT INTO user_responses (round, text) VALUES (?, ?)", round, text);
  }

  getUserResponses(): Map<number, string> {
    const map = new Map<number, string>();
    for (const row of this.sql.exec<UserResponseRow>(
      "SELECT round, text FROM user_responses ORDER BY round",
    )) {
      map.set(row.round, row.text);
    }
    return map;
  }

  // ── Verdict ────────────────────────────────────────────────────────────────

  saveVerdict(verdict: Omit<Verdict, "createdAt">): void {
    this.sql.exec(
      "INSERT INTO verdicts (ruling, key_factors, conditions, dissent) VALUES (?, ?, ?, ?)",
      verdict.ruling,
      JSON.stringify(verdict.keyFactors),
      JSON.stringify(verdict.conditions),
      verdict.dissent,
    );
  }

  getVerdict(): Verdict | null {
    const rows = this.sql.exec<VerdictRow>("SELECT * FROM verdicts LIMIT 1").toArray();
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ruling: r.ruling as Ruling,
      keyFactors: JSON.parse(r.key_factors) as string[],
      conditions: JSON.parse(r.conditions) as string[],
      dissent: r.dissent,
      createdAt: r.created_at,
    };
  }

  // ── Session State ──────────────────────────────────────────────────────────

  setStatus(status: SessionStatus): void {
    this.sql.exec(
      "INSERT INTO session_state (key, value) VALUES ('status', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      status,
    );
  }

  getStatus(): SessionStatus {
    const rows = this.sql
      .exec<StateRow>("SELECT value FROM session_state WHERE key = 'status'")
      .toArray();
    return (rows[0]?.value as SessionStatus) ?? "intake";
  }

  setMeta(key: string, value: string): void {
    this.sql.exec(
      "INSERT INTO session_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  }

  getMeta(key: string): string | null {
    const rows = this.sql
      .exec<StateRow>(
        "SELECT value FROM session_state WHERE key = ?",
        key,
      )
      .toArray();
    return rows[0]?.value ?? null;
  }

  // ── Jury Votes ─────────────────────────────────────────────────────────────

  saveJuryVotes(votes: JuryVote[]): void {
    for (const v of votes) {
      this.sql.exec(
        "INSERT INTO jury_votes (name, persona, vote, rationale) VALUES (?, ?, ?, ?)",
        v.name,
        v.persona,
        v.vote,
        v.rationale,
      );
    }
  }

  getJuryVotes(): JuryVote[] {
    return this.sql
      .exec<JuryVoteRow>("SELECT * FROM jury_votes ORDER BY created_at")
      .toArray()
      .map((r) => ({
        name: r.name,
        persona: r.persona,
        vote: r.vote as JuryVoteValue,
        rationale: r.rationale,
      }));
  }

  // ── Full Case Record ───────────────────────────────────────────────────────

  getCaseRecord(caseId: string): CaseRecord | null {
    const brief = this.getBrief();
    if (!brief) return null;

    const clarifications = this.getClarifications();
    const allArgs = this.getAllArguments();
    const userResponses = this.getUserResponses();
    const verdict = this.getVerdict();
    const juryVotes = this.getJuryVotes();
    const status = this.getStatus();
    const templateId = this.getMeta("templateId");

    // Group arguments into rounds
    const roundMap = new Map<number, Argument[]>();
    for (const arg of allArgs) {
      const list = roundMap.get(arg.round) ?? [];
      list.push(arg);
      roundMap.set(arg.round, list);
    }

    const rounds: DebateRound[] = [...roundMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([round, args]) => ({
        round,
        arguments: args,
        userResponse: userResponses.get(round),
      }));

    return {
      id: caseId,
      brief,
      clarifications,
      rounds,
      verdict: verdict ?? undefined,
      juryVerdict: juryVotes.length > 0
        ? {
            votes: juryVotes,
            tally: {
              proceed: juryVotes.filter((v) => v.vote === "proceed").length,
              against: juryVotes.filter((v) => v.vote === "do-not-proceed").length,
              conditional: juryVotes.filter((v) => v.vote === "conditional").length,
            },
          }
        : undefined,
      status,
      templateId: templateId ?? undefined,
      createdAt: brief.createdAt,
      updatedAt: verdict?.createdAt ?? brief.createdAt,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toArgument(row: ArgumentRow): Argument {
  return {
    id: row.id,
    role: row.role as AgentRole,
    round: row.round,
    text: row.text,
    rebuttalTargetId: row.rebuttal_target_id ?? undefined,
    createdAt: row.created_at,
  };
}
