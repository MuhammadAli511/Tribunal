import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";
import type { Argument, CaseBrief, Clarification, Verdict } from "../types";
import { generateClarifyingQuestions, generateCrossExamQuestion } from "../debate/cross-examiner";
import { synthesiseVerdict, type VerdictInput } from "../debate/verdict-synthesiser";
import { getSignedUrl } from "../voice/convai-websocket";

/**
 * Judge Durable Object — the orchestrator of the tribunal.
 *
 * Responsibilities:
 * - Generate clarifying questions during intake
 * - Generate cross-examination questions mid-debate
 * - Synthesise the final verdict from all arguments
 * - Manage live ConvAI WebSocket session for voice interaction (Module 5)
 *
 * The Judge does not argue — it questions and decides.
 */
export class JudgeDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.initSchema());
  }

  private initSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS judge_actions (
        id         TEXT PRIMARY KEY,
        case_id    TEXT NOT NULL,
        action     TEXT NOT NULL,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  // ── HTTP entry point ──────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (`${request.method} ${url.pathname}`) {
      case "POST /clarify":
        return this.handleClarify(request);
      case "POST /cross-examine":
        return this.handleCrossExamine(request);
      case "POST /verdict":
        return this.handleVerdict(request);
      case "GET /convai/signed-url":
        return this.handleConvAISignedUrl();
      case "GET /history":
        return this.handleHistory(url);
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  // ── Generate clarifying questions for intake ──────────────────────────────

  private async handleClarify(request: Request): Promise<Response> {
    const { caseId, brief } = (await request.json()) as {
      caseId: string;
      brief: CaseBrief;
    };

    const questions = await generateClarifyingQuestions(this.env.AI, brief);

    this.logAction(caseId, "clarify", { questions });

    return json({ questions });
  }

  // ── Generate cross-examination question mid-debate ────────────────────────

  private async handleCrossExamine(request: Request): Promise<Response> {
    const { caseId, brief, clarifications, prosecutorArgument, defenderArgument } =
      (await request.json()) as {
        caseId: string;
        brief: CaseBrief;
        clarifications: Clarification[];
        prosecutorArgument: Argument;
        defenderArgument: Argument;
      };

    const question = await generateCrossExamQuestion(
      this.env.AI,
      brief,
      clarifications,
      prosecutorArgument,
      defenderArgument,
    );

    this.logAction(caseId, "cross-examine", { question });

    return json({ question });
  }

  // ── Synthesise verdict from all arguments ─────────────────────────────────

  private async handleVerdict(request: Request): Promise<Response> {
    const { caseId, input } = (await request.json()) as {
      caseId: string;
      input: VerdictInput;
    };

    const verdict = await synthesiseVerdict(this.env.AI, input);

    this.logAction(caseId, "verdict", verdict);

    return json(verdict);
  }

  // ── ConvAI signed URL for client-side voice session ────────────────────────

  private async handleConvAISignedUrl(): Promise<Response> {
    const agentId = this.env.JUDGE_CONVAI_AGENT_ID;
    if (!agentId) {
      return json({ error: "JUDGE_CONVAI_AGENT_ID not configured" }, 500);
    }

    const signedUrl = await getSignedUrl(this.env.ELEVENLABS_API_KEY, agentId);
    return json({ signedUrl });
  }

  // ── Retrieve judge action history ─────────────────────────────────────────

  private handleHistory(url: URL): Response {
    const caseId = url.searchParams.get("caseId");

    const rows = caseId
      ? this.ctx.storage.sql
          .exec(
            `SELECT * FROM judge_actions WHERE case_id = ? ORDER BY created_at`,
            caseId,
          )
          .toArray()
      : this.ctx.storage.sql
          .exec(`SELECT * FROM judge_actions ORDER BY created_at DESC LIMIT 50`)
          .toArray();

    return json(rows);
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  private logAction(caseId: string, action: string, data: unknown): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO judge_actions (id, case_id, action, data, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      caseId,
      action,
      JSON.stringify(data),
      new Date().toISOString(),
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
