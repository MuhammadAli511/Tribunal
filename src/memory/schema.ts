// ── CaseDO SQLite Schema ─────────────────────────────────────────────────────
// One database per case. Created when a case is first presented.

export const CASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS case_briefs (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clarifications (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    idx        INTEGER NOT NULL,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS arguments (
    id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    role               TEXT NOT NULL,
    round              INTEGER NOT NULL,
    text               TEXT NOT NULL,
    rebuttal_target_id TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_responses (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    round      INTEGER NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS verdicts (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    ruling      TEXT NOT NULL CHECK (ruling IN ('proceed', 'do-not-proceed', 'conditional')),
    key_factors TEXT NOT NULL,  -- JSON array of strings
    conditions  TEXT NOT NULL,  -- JSON array of strings
    dissent     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// ── HistorianDO SQLite Schema ────────────────────────────────────────────────
// Single database spanning every case the user has brought to Tribunal.

export const HISTORIAN_SCHEMA = `
  CREATE TABLE IF NOT EXISTS case_summaries (
    case_id       TEXT PRIMARY KEY,
    brief_snippet TEXT NOT NULL,
    ruling        TEXT NOT NULL CHECK (ruling IN ('proceed', 'do-not-proceed', 'conditional')),
    summary       TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS detected_patterns (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    description TEXT NOT NULL,
    case_ids    TEXT NOT NULL,  -- JSON array of case ID strings
    detected_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;
