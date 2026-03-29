import { HISTORIAN_SCHEMA } from "./schema";
import type { CaseSummary, DetectedPattern, Ruling } from "../types";

// ── Row types ────────────────────────────────────────────────────────────────

type SummaryRow = {
  case_id: string;
  brief_snippet: string;
  ruling: string;
  summary: string;
  created_at: string;
  [k: string]: SqlStorageValue;
};

type PatternRow = {
  id: string;
  description: string;
  case_ids: string;
  detected_at: string;
  [k: string]: SqlStorageValue;
};

/**
 * SQLite helper for the HistorianDO.
 * Single database spanning every case the user has ever brought to Tribunal.
 */
export class HistorianStore {
  constructor(private sql: SqlStorage) {}

  /** Create all tables (idempotent). */
  initSchema(): void {
    this.sql.exec(HISTORIAN_SCHEMA);
  }

  // ── Case Summaries ─────────────────────────────────────────────────────────

  saveCaseSummary(
    caseId: string,
    briefSnippet: string,
    ruling: Ruling,
    summary: string,
  ): void {
    this.sql.exec(
      "INSERT INTO case_summaries (case_id, brief_snippet, ruling, summary) VALUES (?, ?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET brief_snippet = excluded.brief_snippet, ruling = excluded.ruling, summary = excluded.summary",
      caseId,
      briefSnippet,
      ruling,
      summary,
    );
  }

  getCaseSummary(caseId: string): CaseSummary | null {
    const rows = this.sql
      .exec<SummaryRow>("SELECT * FROM case_summaries WHERE case_id = ?", caseId)
      .toArray();
    if (rows.length === 0) return null;
    return toSummary(rows[0]);
  }

  getAllCaseSummaries(): CaseSummary[] {
    return this.sql
      .exec<SummaryRow>("SELECT * FROM case_summaries ORDER BY created_at DESC")
      .toArray()
      .map(toSummary);
  }

  getCaseCount(): number {
    const row = this.sql
      .exec<{ count: number }>("SELECT COUNT(*) as count FROM case_summaries")
      .one();
    return row.count;
  }

  // ── Detected Patterns ──────────────────────────────────────────────────────

  savePattern(description: string, caseIds: string[]): void {
    this.sql.exec(
      "INSERT INTO detected_patterns (description, case_ids) VALUES (?, ?)",
      description,
      JSON.stringify(caseIds),
    );
  }

  getPatterns(): DetectedPattern[] {
    return this.sql
      .exec<PatternRow>("SELECT * FROM detected_patterns ORDER BY detected_at DESC")
      .toArray()
      .map((r) => ({
        id: r.id,
        description: r.description,
        caseIds: JSON.parse(r.case_ids) as string[],
        detectedAt: r.detected_at,
      }));
  }

  /** Replace all patterns (used after re-analysis). */
  replacePatterns(patterns: { description: string; caseIds: string[] }[]): void {
    this.sql.exec("DELETE FROM detected_patterns");
    for (const p of patterns) {
      this.savePattern(p.description, p.caseIds);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toSummary(row: SummaryRow): CaseSummary {
  return {
    caseId: row.case_id,
    briefSnippet: row.brief_snippet,
    ruling: row.ruling as Ruling,
    summary: row.summary,
    createdAt: row.created_at,
  };
}
