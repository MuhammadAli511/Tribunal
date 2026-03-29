import type { Argument, CaseBrief, Clarification, Ruling, Verdict } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VerdictInput {
  brief: CaseBrief;
  clarifications: Clarification[];
  allArguments: Argument[];
}

interface RawVerdictOutput {
  ruling: Ruling;
  keyFactors: string[];
  conditions: string[];
  dissent: string;
}

// ── Model & Prompt ──────────────────────────────────────────────────────────

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

const SYSTEM_PROMPT = `You are the Judge in a decision tribunal. You have heard all arguments and must now deliver your verdict.

Analyse the decision under review, the clarifications from the decision-maker, and all arguments presented by the prosecution, defence, domain expert, and historian.

You MUST respond with ONLY a valid JSON object (no markdown, no commentary) matching this exact schema:

{
  "ruling": "proceed" | "do-not-proceed" | "conditional",
  "keyFactors": ["factor 1", "factor 2"],
  "conditions": ["what would need to change for the ruling to flip"],
  "dissent": "what the losing side got right — acknowledge their strongest point"
}

Rules:
- "ruling" must be exactly one of: "proceed", "do-not-proceed", "conditional"
- "keyFactors" must contain 2-3 strings — the decisive arguments or facts
- "conditions" must contain 1-3 strings — what would change the ruling
- "dissent" must be a single string acknowledging the strongest opposing point
- Be fair, balanced, and decisive. Do not hedge.`;

function buildVerdictPrompt(input: VerdictInput): string {
  let prompt = `## The Decision Under Review\n${input.brief.text}\n`;

  if (input.clarifications.length > 0) {
    prompt += `\n## Clarifications from the Decision-Maker\n`;
    for (const c of input.clarifications) {
      prompt += `- **Q:** ${c.question}\n  **A:** ${c.answer}\n`;
    }
  }

  prompt += `\n## All Arguments Presented\n`;
  for (const arg of input.allArguments) {
    prompt += `### ${arg.role.toUpperCase()} (Round ${arg.round})\n${arg.text}\n\n`;
  }

  prompt += `\n## Your Task\nDeliver your verdict as a JSON object.`;
  return prompt;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Synthesise a structured verdict from all debate arguments using Workers AI.
 * Returns a complete Verdict with ruling, key factors, conditions, and dissent.
 */
export async function synthesiseVerdict(
  ai: Ai,
  input: VerdictInput,
): Promise<Verdict> {
  const response = await ai.run(MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildVerdictPrompt(input) },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  });

  const raw = (response as { response: string }).response;

  // Parse JSON from the response — handle potential markdown fencing
  const jsonStr = raw.replace(/^```json?\s*/, "").replace(/\s*```$/, "").trim();
  const parsed: RawVerdictOutput = JSON.parse(jsonStr);

  // Validate ruling enum
  const validRulings: Ruling[] = ["proceed", "do-not-proceed", "conditional"];
  if (!validRulings.includes(parsed.ruling)) {
    parsed.ruling = "conditional";
  }

  return {
    ruling: parsed.ruling,
    keyFactors: parsed.keyFactors.slice(0, 3),
    conditions: parsed.conditions.slice(0, 3),
    dissent: parsed.dissent,
    createdAt: new Date().toISOString(),
  };
}
