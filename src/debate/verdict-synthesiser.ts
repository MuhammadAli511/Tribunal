import type { Argument, CaseBrief, Clarification, Ruling, Verdict } from "../types";
import { extractAIText } from "./argument-generator";

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

const MODEL = "@cf/openai/gpt-oss-120b" as const;

const SYSTEM_PROMPT = `You are the Judge in a decision tribunal. You have heard all arguments and must now deliver your verdict.

Analyse the decision, the clarifications, and all arguments from prosecution, defence, domain expert, and historian.

You MUST respond with ONLY a valid JSON object (no markdown, no commentary) matching this exact schema:

{
  "ruling": "proceed" | "do-not-proceed" | "conditional",
  "keyFactors": ["factor 1", "factor 2"],
  "conditions": ["what would need to change for the ruling to flip"],
  "dissent": "what the losing side got right"
}

Rules:
- "ruling" must be exactly one of: "proceed", "do-not-proceed", "conditional"
- "keyFactors" must contain 2-3 SHORT plain-text strings. No markdown or special characters.
- "conditions" must contain 1-3 SHORT plain-text strings. No markdown or special characters.
- "dissent" must be one short plain-text sentence. No markdown or special characters.
- All strings will be read aloud, so write them as natural spoken English.
- Be fair, balanced, and decisive.`;

function buildVerdictPrompt(input: VerdictInput): string {
  let prompt = `The Decision Under Review:\n${input.brief.text}\n`;

  if (input.clarifications.length > 0) {
    prompt += `\nClarifications from the Decision-Maker:\n`;
    for (const c of input.clarifications) {
      prompt += `Q: ${c.question}\nA: ${c.answer}\n`;
    }
  }

  prompt += `\nAll Arguments Presented:\n`;
  for (const arg of input.allArguments) {
    prompt += `${arg.role.toUpperCase()} (Round ${arg.round}):\n${arg.text}\n\n`;
  }

  prompt += `\nYour Task: Deliver your verdict as a JSON object.`;
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
    instructions: SYSTEM_PROMPT,
    input: buildVerdictPrompt(input),
    max_tokens: 400,
    temperature: 0.3,
    reasoning: { effort: "low" },
  } as Record<string, unknown>);

  // Extract text from Workers AI response (handles ChatCompletion / standard / string)
  const raw = extractAIText(response);

  console.log("[Verdict] raw AI response length:", raw.length, "preview:", raw.slice(0, 200));

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
    keyFactors: (parsed.keyFactors ?? []).slice(0, 3),
    conditions: (parsed.conditions ?? []).slice(0, 3),
    dissent: parsed.dissent ?? "",
    createdAt: new Date().toISOString(),
  };
}
