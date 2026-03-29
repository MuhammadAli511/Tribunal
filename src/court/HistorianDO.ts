import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";
import type { Argument, Ruling } from "../types";
import { HistorianStore } from "../memory/historian-store";
import { VectorizeClient } from "../memory/vectorize-client";
import {
  generateArgument,
  generateEmbedding,
  type CaseContext,
  type HistorianContext,
} from "../debate/argument-generator";

/**
 * Historian Durable Object — singleton with cross-case memory.
 * Uses HistorianStore (SQLite) for persistent case summaries and pattern tracking.
 * Queries Vectorize for semantically similar past cases.
 * Generates interventions that cite past patterns and precedents.
 * Stores every case summary after verdict for future reference.
 */
export class HistorianDO extends DurableObject<Env> {
  private store: HistorianStore;
  private vectorize: VectorizeClient;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = new HistorianStore(ctx.storage.sql);
    this.vectorize = new VectorizeClient(env.VECTORIZE);
    ctx.blockConcurrencyWhile(async () => this.store.initSchema());
  }

  // ── HTTP entry point ──────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (`${request.method} ${url.pathname}`) {
      case "POST /argue":
        return this.handleArgue(request);
      case "POST /record-verdict":
        return this.handleRecordVerdict(request);
      case "GET /patterns":
        return json(this.store.getPatterns());
      case "GET /cases":
        return json(this.store.getAllCaseSummaries());
      case "GET /case":
        return this.handleGetCase(url);
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  // ── Generate argument with cross-case context ─────────────────────────────

  private async handleArgue(request: Request): Promise<Response> {
    const { caseId, caseCtx } = (await request.json()) as {
      caseId: string;
      caseCtx: CaseContext;
    };

    // Build historian-specific context from past cases
    const historianCtx = await this.buildHistorianContext(caseCtx);

    const text = await generateArgument(
      this.env.AI,
      "historian",
      caseCtx,
      historianCtx,
    );

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const arg: Argument = {
      id,
      role: "historian",
      round: caseCtx.round,
      text,
      createdAt: now,
    };

    return json(arg);
  }

  // ── Build historian context via Vectorize + stored patterns ────────────────

  private async buildHistorianContext(
    caseCtx: CaseContext,
  ): Promise<HistorianContext> {
    const similarCases: HistorianContext["similarCases"] = [];
    const patterns = this.store.getPatterns().map((p) => ({
      description: p.description,
      caseIds: p.caseIds,
    }));

    // Semantic search for similar past cases
    try {
      const embedding = await generateEmbedding(this.env.AI, caseCtx.brief.text);
      const matches = await this.vectorize.searchSimilarCases(embedding, 3);

      for (const match of matches) {
        const summary = this.store.getCaseSummary(match.caseId);
        if (summary) {
          similarCases.push({
            caseId: match.caseId,
            summary: summary.summary,
            score: match.score,
          });
        }
      }
    } catch {
      // Vectorize may not be available in dev — degrade gracefully
    }

    return { similarCases, patterns };
  }

  // ── Record a completed case for future reference ──────────────────────────

  private async handleRecordVerdict(request: Request): Promise<Response> {
    const { caseId, briefSnippet, ruling, summary } = (await request.json()) as {
      caseId: string;
      briefSnippet: string;
      ruling: Ruling;
      summary: string;
    };

    // Store in SQLite
    this.store.saveCaseSummary(caseId, briefSnippet, ruling, summary);

    // Index in Vectorize for semantic search
    try {
      const embedding = await generateEmbedding(this.env.AI, summary);
      await this.vectorize.indexCase(caseId, summary, embedding);
    } catch {
      // Vectorize may not be available — case is still stored in SQLite
    }

    return json({ ok: true });
  }

  // ── Get a specific case summary ───────────────────────────────────────────

  private handleGetCase(url: URL): Response {
    const caseId = url.searchParams.get("caseId");
    if (!caseId) return new Response("Missing caseId param", { status: 400 });

    const summary = this.store.getCaseSummary(caseId);
    if (!summary) return new Response("Case not found", { status: 404 });

    return json(summary);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
