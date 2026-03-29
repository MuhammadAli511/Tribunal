/**
 * Router Worker — main entry point for the Tribunal backend.
 *
 * Responsibilities:
 * - REST API for case management
 * - WebSocket upgrade and routing to CaseDO
 * - SSE endpoint for live debate event stream
 * - CORS headers for the Next.js frontend
 * - Re-exports all DO classes and the DebateWorkflow for wrangler
 * - Delegates non-API routes to the OpenNext (Next.js) handler
 */

import type { Env } from "./env";

// ── Re-export Durable Objects & Workflow (required by wrangler) ─────────────

export { CaseDO } from "./court/CaseDO";
export { JudgeDO } from "./court/JudgeDO";
export { ProsecutorDO } from "./court/ProsecutorDO";
export { DefenderDO } from "./court/DefenderDO";
export { DomainExpertDO } from "./court/DomainExpertDO";
export { HistorianDO } from "./court/HistorianDO";
export { DebateWorkflow } from "./debate/debate-workflow";

// ── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function corsResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── JSON helpers ────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// ── Route matching ──────────────────────────────────────────────────────────

interface RouteMatch {
  params: Record<string, string>;
}

function matchRoute(
  pathname: string,
  pattern: string,
): RouteMatch | null {
  // Convert "/api/cases/:id/stream" to regex with named groups
  const paramNames: string[] = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  const match = pathname.match(new RegExp(`^${regexStr}$`));
  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  return { params };
}

// ── API handlers ────────────────────────────────────────────────────────────

/** POST /api/cases — Create a new case and return its ID */
async function handleCreateCase(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { text?: string };
  if (!body.text) return errorJson("Missing 'text' field");

  // Generate a new CaseDO with a unique ID
  const caseId = env.CASE_DO.newUniqueId();
  const caseDO = env.CASE_DO.get(caseId);

  await caseDO.fetch(
    new Request("http://do/present", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body.text }),
    }),
  );

  return json({ caseId: caseId.toString() }, 201);
}

/** GET /api/cases — List all past cases via HistorianDO */
async function handleListCases(env: Env): Promise<Response> {
  const historianDO = env.HISTORIAN_DO.get(env.HISTORIAN_DO.idFromName("historian"));
  const res = await historianDO.fetch(new Request("http://do/cases"));
  const cases = await res.json();
  return json(cases);
}

/** GET /api/cases/:id — Get full case record */
async function handleGetCase(env: Env, caseId: string): Promise<Response> {
  const caseDO = env.CASE_DO.get(env.CASE_DO.idFromString(caseId));
  const res = await caseDO.fetch(new Request("http://do/record"));
  if (!res.ok) return errorJson("Case not found", 404);
  const record = await res.json();
  return json(record);
}

/** POST /api/cases/:id/clarify — Submit a clarification answer */
async function handleClarify(
  request: Request,
  env: Env,
  caseId: string,
): Promise<Response> {
  const caseDO = env.CASE_DO.get(env.CASE_DO.idFromString(caseId));
  const res = await caseDO.fetch(
    new Request("http://do/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: request.body,
    }),
  );
  return json(await res.json());
}

/** POST /api/cases/:id/respond — Submit a user response during cross-exam */
async function handleUserResponse(
  request: Request,
  env: Env,
  caseId: string,
): Promise<Response> {
  const caseDO = env.CASE_DO.get(env.CASE_DO.idFromString(caseId));
  const res = await caseDO.fetch(
    new Request("http://do/user-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: request.body,
    }),
  );
  return json(await res.json());
}

/** POST /api/cases/:id/start-debate — Trigger the debate workflow */
async function handleStartDebate(env: Env, caseId: string): Promise<Response> {
  const instance = await env.DEBATE_WORKFLOW.create({
    params: { caseId },
  });
  return json({ instanceId: instance.id, caseId }, 202);
}

/** POST /api/cases/:id/intake — Judge generates clarifying questions */
async function handleIntake(env: Env, caseId: string): Promise<Response> {
  // Get the case brief
  const caseDO = env.CASE_DO.get(env.CASE_DO.idFromString(caseId));
  const recordRes = await caseDO.fetch(new Request("http://do/record"));
  if (!recordRes.ok) return errorJson("Case not found", 404);
  const record = (await recordRes.json()) as { brief: { text: string; createdAt: string } };

  // Ask the Judge for clarifying questions
  const judgeDO = env.JUDGE_DO.get(env.JUDGE_DO.idFromName("judge"));
  const judgeRes = await judgeDO.fetch(
    new Request("http://do/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, brief: record.brief }),
    }),
  );

  return json(await judgeRes.json());
}

/** GET /api/judge/convai-url — Get signed ConvAI WebSocket URL */
async function handleConvAIUrl(env: Env): Promise<Response> {
  const judgeDO = env.JUDGE_DO.get(env.JUDGE_DO.idFromName("judge"));
  const res = await judgeDO.fetch(new Request("http://do/convai/signed-url"));
  const body = await res.json();
  return json(body, res.status);
}

/** GET /api/cases/:id/ws — WebSocket upgrade, proxied to CaseDO */
async function handleWebSocket(
  request: Request,
  env: Env,
  caseId: string,
): Promise<Response> {
  const caseDO = env.CASE_DO.get(env.CASE_DO.idFromString(caseId));
  // Forward the upgrade request directly to CaseDO
  return caseDO.fetch(request);
}

/**
 * GET /api/cases/:id/stream — SSE stream of debate events.
 * Opens an internal WebSocket to CaseDO and relays messages as SSE.
 */
async function handleSSEStream(
  env: Env,
  caseId: string,
): Promise<Response> {
  const caseDO = env.CASE_DO.get(env.CASE_DO.idFromString(caseId));

  // Open internal WebSocket to CaseDO
  const wsRequest = new Request("http://do/websocket", {
    headers: { Upgrade: "websocket" },
  });
  const wsResponse = await caseDO.fetch(wsRequest);
  const ws = wsResponse.webSocket;
  if (!ws) return errorJson("Failed to open internal WebSocket", 500);
  ws.accept();

  // Create SSE response stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  ws.addEventListener("message", (event) => {
    const data = typeof event.data === "string" ? event.data : "";
    writer.write(encoder.encode(`data: ${data}\n\n`)).catch(() => {
      // Client disconnected
      ws.close();
    });
  });

  ws.addEventListener("close", () => {
    writer.close().catch(() => {});
  });

  ws.addEventListener("error", () => {
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}

/** POST /api/seed — Seed the HistorianDO with past case summaries */
async function handleSeed(request: Request, env: Env): Promise<Response> {
  const { cases } = (await request.json()) as {
    cases: {
      caseId: string;
      briefSnippet: string;
      ruling: string;
      summary: string;
    }[];
  };

  const historianDO = env.HISTORIAN_DO.get(env.HISTORIAN_DO.idFromName("historian"));

  for (const c of cases) {
    await historianDO.fetch(
      new Request("http://do/record-verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      }),
    );
  }

  return json({ seeded: cases.length });
}

// ── API Router ──────────────────────────────────────────────────────────────

async function handleApi(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const { method } = request;
  const { pathname } = url;
  let m: RouteMatch | null;

  // POST /api/seed — seed historian with past cases (demo prep)
  if (method === "POST" && pathname === "/api/seed") {
    return handleSeed(request, env);
  }

  // POST /api/cases — create case
  if (method === "POST" && pathname === "/api/cases") {
    return handleCreateCase(request, env);
  }

  // GET /api/cases — list all cases
  if (method === "GET" && pathname === "/api/cases") {
    return handleListCases(env);
  }

  // GET /api/judge/convai-url — ConvAI signed URL
  if (method === "GET" && pathname === "/api/judge/convai-url") {
    return handleConvAIUrl(env);
  }

  // Routes with :id parameter
  m = matchRoute(pathname, "/api/cases/:id");
  if (m && method === "GET") {
    return handleGetCase(env, m.params.id);
  }

  m = matchRoute(pathname, "/api/cases/:id/stream");
  if (m && method === "GET") {
    return handleSSEStream(env, m.params.id);
  }

  m = matchRoute(pathname, "/api/cases/:id/ws");
  if (m && method === "GET" && request.headers.get("Upgrade") === "websocket") {
    return handleWebSocket(request, env, m.params.id);
  }

  m = matchRoute(pathname, "/api/cases/:id/clarify");
  if (m && method === "POST") {
    return handleClarify(request, env, m.params.id);
  }

  m = matchRoute(pathname, "/api/cases/:id/respond");
  if (m && method === "POST") {
    return handleUserResponse(request, env, m.params.id);
  }

  m = matchRoute(pathname, "/api/cases/:id/start-debate");
  if (m && method === "POST") {
    return handleStartDebate(env, m.params.id);
  }

  m = matchRoute(pathname, "/api/cases/:id/intake");
  if (m && method === "POST") {
    return handleIntake(env, m.params.id);
  }

  return errorJson("Not found", 404);
}

// ── Default export — main fetch handler ─────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse(new Response(null, { status: 204 }));
    }

    // WebSocket upgrades — must NOT go through corsResponse (status 101)
    if (request.headers.get("Upgrade") === "websocket") {
      const wsMatch = matchRoute(url.pathname, "/api/cases/:id/ws");
      if (wsMatch) {
        return handleWebSocket(request, env, wsMatch.params.id);
      }
      return new Response("Not found", { status: 404 });
    }

    // API routes — handled by our router
    if (url.pathname.startsWith("/api/")) {
      const response = await handleApi(request, env, url);
      return corsResponse(response);
    }

    // All other routes — delegate to OpenNext (Next.js frontend)
    try {
      const { default: openNext } = await import("../.open-next/worker.js");
      return openNext.fetch(request, env, ctx);
    } catch {
      return new Response("Frontend not built. Run: npm run build:cf", {
        status: 503,
      });
    }
  },
} satisfies ExportedHandler<Env>;
