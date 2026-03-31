import type { Argument, CaseBrief, Clarification, JuryVote, JuryVerdict, Verdict } from "../types";
import { extractAIText } from "./argument-generator";

const MODEL = "@cf/openai/gpt-oss-120b" as const;

interface JuryInput {
  brief: CaseBrief;
  clarifications: Clarification[];
  allArguments: Argument[];
  verdict: Verdict;
}

const JURORS = [
  { name: "The Optimist", persona: "Focuses on upside potential and opportunity cost of inaction. Leans toward proceeding." },
  { name: "The Skeptic", persona: "Focuses on what could go wrong and hidden assumptions. Leans against proceeding." },
  { name: "The Pragmatist", persona: "Focuses on feasibility, resource constraints, and timing. Neutral." },
  { name: "The Ethicist", persona: "Focuses on fairness, stakeholder impact, and long-term consequences. Neutral." },
  { name: "The Maverick", persona: "Takes an unconventional or contrarian angle. Unpredictable." },
] as const;

const SYSTEM_PROMPT = `You are simulating a jury panel for a decision tribunal. You must generate votes for exactly 5 jurors, each with a distinct perspective.

You MUST respond with ONLY a valid JSON array (no markdown, no commentary) of 5 objects:

[
  { "name": "The Optimist", "vote": "proceed"|"do-not-proceed"|"conditional", "rationale": "1 sentence" },
  { "name": "The Skeptic", "vote": "...", "rationale": "..." },
  { "name": "The Pragmatist", "vote": "...", "rationale": "..." },
  { "name": "The Ethicist", "vote": "...", "rationale": "..." },
  { "name": "The Maverick", "vote": "...", "rationale": "..." }
]

Rules:
- Each juror's vote should reflect their persona and be INDEPENDENT of the Judge's verdict.
- Rationale must be exactly 1 short sentence in plain spoken English. No markdown.
- "vote" must be exactly: "proceed", "do-not-proceed", or "conditional".
- The Maverick should often disagree with the majority or take a surprising angle.`;

function buildJuryPrompt(input: JuryInput): string {
  let prompt = `Decision: ${input.brief.text}\n`;

  if (input.clarifications.length > 0) {
    prompt += "\nClarifications:\n";
    for (const c of input.clarifications) {
      prompt += `Q: ${c.question}\nA: ${c.answer}\n`;
    }
  }

  prompt += "\nArguments Presented:\n";
  for (const arg of input.allArguments) {
    prompt += `${arg.role.toUpperCase()}: ${arg.text}\n\n`;
  }

  prompt += `\nJudge's Verdict: ${input.verdict.ruling}\n`;
  prompt += `Key Factors: ${input.verdict.keyFactors.join("; ")}\n`;
  prompt += `Dissent: ${input.verdict.dissent}\n`;

  prompt += "\nGenerate the jury votes as a JSON array.";
  return prompt;
}

export async function deliberateJury(
  ai: Ai,
  input: JuryInput,
): Promise<JuryVerdict> {
  const response = await ai.run(MODEL, {
    instructions: SYSTEM_PROMPT,
    input: buildJuryPrompt(input),
    max_tokens: 500,
    temperature: 0.7,
    reasoning: { effort: "low" },
  } as Record<string, unknown>);

  const raw = extractAIText(response);
  const jsonStr = raw.replace(/^```json?\s*/, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(jsonStr) as { name: string; vote: string; rationale: string }[];

  const votes: JuryVote[] = JURORS.map((juror, i) => {
    const found = parsed.find((p) => p.name === juror.name) ?? parsed[i];
    const vote = (["proceed", "do-not-proceed", "conditional"].includes(found?.vote)
      ? found.vote
      : "conditional") as JuryVote["vote"];
    return {
      name: juror.name,
      persona: juror.persona,
      vote,
      rationale: found?.rationale ?? "No comment.",
    };
  });

  return {
    votes,
    tally: {
      proceed: votes.filter((v) => v.vote === "proceed").length,
      against: votes.filter((v) => v.vote === "do-not-proceed").length,
      conditional: votes.filter((v) => v.vote === "conditional").length,
    },
  };
}
