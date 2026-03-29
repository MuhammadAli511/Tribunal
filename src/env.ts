/**
 * Cloudflare Worker environment bindings.
 * Mirrors the bindings declared in wrangler.jsonc.
 */
export interface Env {
  // ── Workers AI ───────────────────────────────────────────────────────────
  AI: Ai;

  // ── Vectorize ────────────────────────────────────────────────────────────
  VECTORIZE: VectorizeIndex;

  // ── Durable Objects ──────────────────────────────────────────────────────
  CASE_DO: DurableObjectNamespace;
  JUDGE_DO: DurableObjectNamespace;
  PROSECUTOR_DO: DurableObjectNamespace;
  DEFENDER_DO: DurableObjectNamespace;
  DOMAIN_EXPERT_DO: DurableObjectNamespace;
  HISTORIAN_DO: DurableObjectNamespace;

  // ── Workflows ────────────────────────────────────────────────────────────
  DEBATE_WORKFLOW: Workflow;

  // ── Secrets (set via `wrangler secret put`) ──────────────────────────────
  ELEVENLABS_API_KEY: string;

  // ── Variables ────────────────────────────────────────────────────────────
  JUDGE_CONVAI_AGENT_ID: string;
}
