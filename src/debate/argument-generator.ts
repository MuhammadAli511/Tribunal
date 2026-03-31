import type { AgentRole, Argument, CaseBrief, Clarification } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Context passed to argument generation. */
export interface CaseContext {
  brief: CaseBrief;
  clarifications: Clarification[];
  priorArguments: Argument[];
  round: number;
  /** Optional domain hint from the selected decision template */
  templateHint?: string;
}

/** Historian-specific context for pattern-aware arguments. */
export interface HistorianContext {
  similarCases: { caseId: string; summary: string; score: number }[];
  patterns: { description: string; caseIds: string[] }[];
}

// ── Model ─────────────────────────────────────────────────────────────────────

const MODEL = "@cf/openai/gpt-oss-120b" as const;

// ── System prompts per role ───────────────────────────────────────────────────

const SPEECH_RULES = `

OUTPUT RULES — your response will be read aloud by a text-to-speech engine:
- Write EXACTLY 1-2 short paragraphs, no more than 95 words total. Prioritize one strong point over breadth.
- Use plain conversational English as if speaking in a courtroom.
- NEVER use markdown, bold, italics, headers, bullet points, numbered lists, tables, or special characters like dashes, pipes, asterisks, or brackets.
- NEVER cite sources, URLs, or study names.
- Do not use percentages with special formatting. Say "about 15 percent" not "~15 %" or "15%".
- Keep sentences short and punchy. No run-on sentences.`;

const SYSTEM_PROMPTS: Record<Exclude<AgentRole, "judge">, string> = {
  prosecutor: `You are the Prosecutor in a decision tribunal. Your role is to argue AGAINST the proposed decision.

Be adversarial but fair. Find weaknesses, risks, and blind spots.
Challenge assumptions the decision-maker may have overlooked.
${SPEECH_RULES}`,

  defender: `You are the Defender in a decision tribunal. Your role is to STEELMAN the proposed decision.

Find the strongest arguments in favour. Highlight benefits and strategic advantages.
Address prosecution concerns with concrete counterarguments.
${SPEECH_RULES}`,

  "domain-expert": `You are the Domain Expert in a decision tribunal. Your role is to provide FACTUAL GROUNDING.

Share relevant data points, industry context, and technical considerations.
Stay neutral. Present facts that both sides can use.
${SPEECH_RULES}`,

  historian: `You are the Historian in a decision tribunal. Your role is to provide PATTERN-AWARE context.

Draw on past decisions and their outcomes. Identify patterns and lessons learned.
Note when this decision mirrors or diverges from previous ones.
${SPEECH_RULES}`,
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildUserPrompt(
  role: Exclude<AgentRole, "judge">,
  ctx: CaseContext,
  historianCtx?: HistorianContext,
): string {
  let prompt = `The Decision Under Review:\n${ctx.brief.text}\n`;

  if (ctx.templateHint) {
    prompt += `\nDomain Context: ${ctx.templateHint}\n`;
  }

  if (ctx.clarifications.length > 0) {
    prompt += `\nClarifications from the Decision-Maker:\n`;
    for (const c of ctx.clarifications) {
      prompt += `Q: ${c.question}\nA: ${c.answer}\n`;
    }
  }

  if (ctx.priorArguments.length > 0) {
    prompt += `\nPrior Arguments This Round:\n`;
    for (const arg of ctx.priorArguments) {
      prompt += `${arg.role.toUpperCase()}:\n${arg.text}\n\n`;
    }
  }

  if (role === "historian" && historianCtx) {
    if (historianCtx.similarCases.length > 0) {
      prompt += `\nSimilar Past Cases:\n`;
      for (const c of historianCtx.similarCases) {
        prompt += `Case ${c.caseId} (similarity ${(c.score * 100).toFixed(0)} percent): ${c.summary}\n`;
      }
    }
    if (historianCtx.patterns.length > 0) {
      prompt += `\nDetected Patterns Across Past Cases:\n`;
      for (const p of historianCtx.patterns) {
        prompt += `${p.description} (observed in ${p.caseIds.length} case${p.caseIds.length === 1 ? "" : "s"})\n`;
      }
    }
  }

  prompt += `\nYour Task: Provide your ${role} argument for round ${ctx.round}. Hard cap: 95 words or fewer. Plain text only.`;
  return prompt;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a role-specific argument using Workers AI.
 *
 * @param ai        - Workers AI binding from the environment
 * @param role      - The agent role (prosecutor, defender, domain-expert, historian)
 * @param caseCtx   - Case brief, clarifications, prior arguments, and round number
 * @param historianCtx - Optional: similar past cases and detected patterns (historian only)
 * @returns The generated argument text
 */
export async function generateArgument(
  ai: Ai,
  role: Exclude<AgentRole, "judge">,
  caseCtx: CaseContext,
  historianCtx?: HistorianContext,
): Promise<string> {
  const response = await ai.run(MODEL, {
    instructions: SYSTEM_PROMPTS[role],
    input: buildUserPrompt(role, caseCtx, historianCtx),
    max_tokens: 220,
    temperature: 0.7,
    reasoning: { effort: "low" },
  } as Record<string, unknown>);

  return sanitizeForSpeech(extractAIText(response));
}

/**
 * Strip markdown/special characters that slip through despite prompt instructions.
 * Ensures clean plain text suitable for TTS.
 */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")     // bold/italic
    .replace(/#{1,6}\s*/g, "")                      // headers
    .replace(/^\s*[-*]\s+/gm, "")                   // bullet points
    .replace(/^\s*\d+\.\s+/gm, "")                  // numbered lists
    .replace(/\|[^|]*\|/g, "")                       // table cells
    .replace(/^[-|:\s]+$/gm, "")                     // table separators
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")         // links
    .replace(/`([^`]+)`/g, "$1")                     // inline code
    .replace(/[~><]/g, "")                            // leftover markdown
    .replace(/\n{3,}/g, "\n\n")                       // collapse blank lines
    .trim();
}

// ── AI response extraction ────────────────────────────────────────────────

/**
 * Extract text from a Workers AI response.
 * Handles multiple response shapes:
 * - Plain string
 * - { response: string } (Workers AI standard)
 * - { choices: [{ message: { content: string } }] } (ChatCompletion)
 * - { output: [{ type: "message", content: [{ text }] }] } (Responses API / gpt-oss)
 */
export function extractAIText(response: unknown): string {
  if (typeof response === "string") return response;

  const r = response as Record<string, unknown>;

  // Workers AI standard: { response: string }
  if (typeof r.response === "string") return r.response;

  // OpenAI Responses API format (gpt-oss-120b via ai.run with input/instructions):
  // { output: [ { type: "reasoning", ... }, { type: "message", content: [{ type: "output_text", text }] } ] }
  if (Array.isArray(r.output)) {
    for (const item of r.output) {
      const block = item as Record<string, unknown>;
      if (block.type === "message" && Array.isArray(block.content)) {
        for (const part of block.content) {
          const p = part as Record<string, unknown>;
          if (typeof p.text === "string") return p.text;
        }
      }
    }
  }

  // ChatCompletion format: { choices: [{ message: { content, reasoning } }] }
  if (Array.isArray(r.choices) && r.choices.length > 0) {
    const msg = (r.choices[0] as Record<string, unknown>).message as
      | Record<string, unknown>
      | undefined;
    if (msg) {
      if (typeof msg.content === "string") return msg.content;
      if (typeof msg.reasoning === "string") return msg.reasoning;
    }
  }

  // Last resort
  return JSON.stringify(response);
}

// ── Embedding helper ──────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5" as const;

/**
 * Generate a 768-dimensional embedding for text using Workers AI.
 * Used by the Historian for Vectorize semantic search.
 */
export async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
  const result = await ai.run(EMBEDDING_MODEL, { text: [text] });
  return (result as { data: number[][] }).data[0];
}
