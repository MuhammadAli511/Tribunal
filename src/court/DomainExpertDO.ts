import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";
import type { Argument } from "../types";
import { generateArgument, type CaseContext } from "../debate/argument-generator";

/**
 * Domain Expert Durable Object — one instance shared across cases.
 * Receives case context from the debate workflow, generates factually-grounded
 * analysis with neutral data points and benchmarks, and stores them in local
 * SQLite for cross-session memory.
 */
export class DomainExpertDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.initSchema());
  }

  private initSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS agent_arguments (
        id          TEXT PRIMARY KEY,
        case_id     TEXT NOT NULL,
        round       INTEGER NOT NULL,
        text        TEXT NOT NULL,
        rebuttal_target_id TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  // ── HTTP entry point ──────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (`${request.method} ${url.pathname}`) {
      case "POST /argue":
        return this.handleArgue(request);
      case "GET /history":
        return this.handleHistory(url);
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  // ── Generate argument ─────────────────────────────────────────────────────

  private async handleArgue(request: Request): Promise<Response> {
    const { caseId, caseCtx } = (await request.json()) as {
      caseId: string;
      caseCtx: CaseContext;
    };

    const text = await generateArgument(this.env.AI, "domain-expert", caseCtx);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.ctx.storage.sql.exec(
      `INSERT INTO agent_arguments (id, case_id, round, text, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      caseId,
      caseCtx.round,
      text,
      now,
    );

    const arg: Argument = {
      id,
      role: "domain-expert",
      round: caseCtx.round,
      text,
      createdAt: now,
    };

    return json(arg);
  }

  // ── Retrieve past arguments ───────────────────────────────────────────────

  private handleHistory(url: URL): Response {
    const caseId = url.searchParams.get("caseId");

    const rows = caseId
      ? this.ctx.storage.sql
          .exec(`SELECT * FROM agent_arguments WHERE case_id = ? ORDER BY created_at`, caseId)
          .toArray()
      : this.ctx.storage.sql
          .exec(`SELECT * FROM agent_arguments ORDER BY created_at DESC LIMIT 50`)
          .toArray();

    return json(rows);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
