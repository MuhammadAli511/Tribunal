import type { AgentRole, Argument, CaseBrief, Clarification } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Context passed to argument generation. */
export interface CaseContext {
  brief: CaseBrief;
  clarifications: Clarification[];
  priorArguments: Argument[];
  round: number;
}

/** Historian-specific context for pattern-aware arguments. */
export interface HistorianContext {
  similarCases: { caseId: string; summary: string; score: number }[];
  patterns: { description: string; caseIds: string[] }[];
}

// ── Model ─────────────────────────────────────────────────────────────────────

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

// ── System prompts per role ───────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<Exclude<AgentRole, "judge">, string> = {
  prosecutor: `You are the Prosecutor in a decision tribunal. Your role is to argue AGAINST the proposed decision.

Be adversarial but fair. Find weaknesses, risks, blind spots, and potential negative consequences.
Challenge assumptions the decision-maker may have overlooked.
Cite specific concerns grounded in the details of the case.

Keep your argument to 2-4 focused paragraphs. Be direct and impactful.`,

  defender: `You are the Defender in a decision tribunal. Your role is to STEELMAN the proposed decision.

Find the strongest possible arguments in favour. Highlight benefits, opportunities, and strategic advantages.
Address concerns raised by the prosecution with concrete counterarguments.
Reinforce the decision-maker's reasoning where it is sound.

Keep your argument to 2-4 focused paragraphs. Be persuasive and clear.`,

  "domain-expert": `You are the Domain Expert in a decision tribunal. Your role is to provide FACTUAL GROUNDING.

Analyse the decision from a subject-matter expertise perspective.
Provide relevant data points, industry context, benchmarks, and technical considerations.
Stay neutral — present facts that both sides can use. Do not advocate for or against the decision.

Keep your argument to 2-4 focused paragraphs. Be specific and evidence-based.`,

  historian: `You are the Historian in a decision tribunal. Your role is to provide PATTERN-AWARE context.

Draw on past decisions and their outcomes. Identify patterns, precedents, and lessons learned.
Note when the current decision mirrors or diverges from previous ones.
If provided with similar past cases, reference them specifically and explain what happened.

Keep your argument to 2-4 focused paragraphs. Be insightful and grounded in history.`,
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildUserPrompt(
  role: Exclude<AgentRole, "judge">,
  ctx: CaseContext,
  historianCtx?: HistorianContext,
): string {
  let prompt = `## The Decision Under Review\n${ctx.brief.text}\n`;

  if (ctx.clarifications.length > 0) {
    prompt += `\n## Clarifications from the Decision-Maker\n`;
    for (const c of ctx.clarifications) {
      prompt += `- **Q:** ${c.question}\n  **A:** ${c.answer}\n`;
    }
  }

  if (ctx.priorArguments.length > 0) {
    prompt += `\n## Prior Arguments This Round\n`;
    for (const arg of ctx.priorArguments) {
      prompt += `### ${arg.role.toUpperCase()}\n${arg.text}\n\n`;
    }
  }

  if (role === "historian" && historianCtx) {
    if (historianCtx.similarCases.length > 0) {
      prompt += `\n## Similar Past Cases\n`;
      for (const c of historianCtx.similarCases) {
        prompt += `- **Case ${c.caseId}** (similarity ${(c.score * 100).toFixed(0)}%): ${c.summary}\n`;
      }
    }
    if (historianCtx.patterns.length > 0) {
      prompt += `\n## Detected Patterns Across Past Cases\n`;
      for (const p of historianCtx.patterns) {
        prompt += `- ${p.description} (observed in ${p.caseIds.length} case${p.caseIds.length === 1 ? "" : "s"})\n`;
      }
    }
  }

  prompt += `\n## Your Task\nProvide your ${role} argument for round ${ctx.round}.`;
  return prompt;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a role-specific argument using Workers AI (Llama 3.3 70B).
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
    messages: [
      { role: "system", content: SYSTEM_PROMPTS[role] },
      { role: "user", content: buildUserPrompt(role, caseCtx, historianCtx) },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return (response as { response: string }).response;
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
