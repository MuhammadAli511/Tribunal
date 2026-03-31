import { DurableObject } from "cloudflare:workers";
import { CaseStore } from "../memory/case-store";
import type { Env } from "../env";
import type { AgentRole, Argument, Clarification, DebateEvent, JuryVerdict, SessionStatus, Verdict } from "../types";

/**
 * One Durable Object per case.
 * Stores the case brief, clarifications, arguments, and verdict in SQLite.
 * Manages WebSocket connections for real-time debate streaming.
 * Uses alarms for between-session deliberation.
 */
export class CaseDO extends DurableObject<Env> {
  private store: CaseStore;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = new CaseStore(ctx.storage.sql);
    ctx.blockConcurrencyWhile(async () => {
      this.store.initSchema();
    });
  }

  // ── HTTP / WebSocket entry point ───────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    // REST API
    switch (`${request.method} ${url.pathname}`) {
      case "POST /present":
        return this.handlePresent(request);
      case "POST /clarify":
        return this.handleClarify(request);
      case "POST /argument":
        return this.handleArgument(request);
      case "POST /argument-silent":
        return this.handleArgumentSilent(request);
      case "POST /broadcast-speaking":
        return this.handleBroadcastSpeaking(request);
      case "POST /user-response":
        return this.handleUserResponse(request);
      case "POST /verdict":
        return this.handleVerdict(request);
      case "POST /jury-verdict":
        return this.handleJuryVerdict(request);
      case "POST /broadcast-audio":
        return this.handleBroadcastAudio(request);
      case "POST /broadcast-sentiment":
        return this.handleBroadcastSentiment(request);
      case "GET /record":
        return this.handleGetRecord();
      case "GET /status":
        return json({ status: this.store.getStatus() });
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  private async handlePresent(request: Request): Promise<Response> {
    const { text, templateId } = (await request.json()) as { text: string; templateId?: string };
    const briefId = this.store.saveBrief(text);
    this.store.setStatus("intake");
    if (templateId) {
      this.store.setMeta("templateId", templateId);
    }
    this.broadcast({ type: "status_change", status: "intake" });
    return json({ briefId });
  }

  private async handleClarify(request: Request): Promise<Response> {
    const { index, question, answer } = (await request.json()) as Clarification;
    this.store.saveClarification(index, question, answer);
    this.broadcast({ type: "clarification", data: { question, answer, index } });
    return json({ ok: true });
  }

  private async handleArgument(request: Request): Promise<Response> {
    const body = (await request.json()) as Omit<Argument, "id" | "createdAt">;
    const arg = this.store.saveArgument(body);

    // Ensure status is "debating" once arguments flow in
    if (this.store.getStatus() === "intake") {
      this.store.setStatus("debating");
      this.broadcast({ type: "status_change", status: "debating" });
    }

    this.broadcast({ type: "argument", data: arg });
    return json(arg);
  }

  private async handleArgumentSilent(request: Request): Promise<Response> {
    const body = (await request.json()) as Omit<Argument, "id" | "createdAt">;
    const arg = this.store.saveArgument(body);

    if (this.store.getStatus() === "intake") {
      this.store.setStatus("debating");
      this.broadcast({ type: "status_change", status: "debating" });
    }

    return json(arg);
  }

  private async handleBroadcastSpeaking(request: Request): Promise<Response> {
    const { argument, audioBase64 } = (await request.json()) as {
      argument: Argument;
      audioBase64: string;
    };
    this.broadcast({ type: "speaking", data: argument, audioBase64 });
    return json({ ok: true });
  }

  private async handleUserResponse(request: Request): Promise<Response> {
    const { round, text } = (await request.json()) as { round: number; text: string };
    this.store.saveUserResponse(round, text);
    this.broadcast({ type: "user_response", round, text });
    return json({ ok: true });
  }

  private async handleVerdict(request: Request): Promise<Response> {
    const body = (await request.json()) as Omit<Verdict, "createdAt">;
    this.store.saveVerdict(body);
    this.store.setStatus("verdict");

    const saved = this.store.getVerdict()!;
    this.broadcast({ type: "verdict", data: saved });
    this.broadcast({ type: "status_change", status: "verdict" });
    return json(saved);
  }

  private async handleJuryVerdict(request: Request): Promise<Response> {
    const juryVerdict = (await request.json()) as JuryVerdict;
    this.store.saveJuryVotes(juryVerdict.votes);
    this.broadcast({ type: "jury_verdict", data: juryVerdict });
    return json({ ok: true });
  }

  private handleGetRecord(): Response {
    const caseId = this.ctx.id.toString();
    const record = this.store.getCaseRecord(caseId);
    if (!record) return new Response("No case found", { status: 404 });
    return json(record);
  }

  private async handleBroadcastAudio(request: Request): Promise<Response> {
    const { role, audioBase64 } = (await request.json()) as {
      role: AgentRole;
      audioBase64: string;
    };
    this.broadcast({ type: "audio", role, audioBase64 });
    return json({ ok: true });
  }

  private async handleBroadcastSentiment(request: Request): Promise<Response> {
    const { role, score } = (await request.json()) as { role: AgentRole; score: number };
    this.broadcast({ type: "sentiment", role, score });
    return json({ ok: true });
  }

  // ── Status management ──────────────────────────────────────────────────────

  setStatus(status: SessionStatus): void {
    this.store.setStatus(status);
    this.broadcast({ type: "status_change", status });
  }

  getStatus(): SessionStatus {
    return this.store.getStatus();
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Client messages handled here in future (e.g. ping, user actions)
    if (typeof message === "string") {
      try {
        const data = JSON.parse(message);
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // ignore malformed messages
      }
    }
  }

  async webSocketClose(): Promise<void> {
    // Connection closed — if debate is in progress, schedule alarm for
    // between-session deliberation
    const status = this.store.getStatus();
    if (status === "debating" || status === "cross-exam") {
      const sockets = this.ctx.getWebSockets();
      if (sockets.length === 0) {
        // No clients connected — switch to deliberating and schedule alarm
        this.store.setStatus("deliberating");
        await this.ctx.storage.setAlarm(Date.now() + 30_000); // 30s delay
      }
    }
  }

  // ── Alarm (between-session deliberation) ───────────────────────────────────

  async alarm(): Promise<void> {
    const status = this.store.getStatus();
    if (status !== "deliberating") return;

    // Between-session deliberation will be wired in the Debate Workflow (Module 4).
    // For now, this is a placeholder that the workflow can trigger.
  }

  // ── Broadcast to all connected WebSocket clients ───────────────────────────

  private broadcast(event: DebateEvent): void {
    const message = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // socket already closed
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
