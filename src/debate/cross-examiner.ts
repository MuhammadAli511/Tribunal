import type { Argument, CaseBrief, Clarification } from "../types";

// ── Model ─────────────────────────────────────────────────────────────────────

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

// ── Intake clarifying questions ─────────────────────────────────────────────

const INTAKE_SYSTEM_PROMPT = `You are the Judge in a decision tribunal. A person has just presented a decision they are considering.

Your job is to ask 1-3 SHORT clarifying questions that will help the tribunal understand the decision better.

Focus on:
- What is not yet clear about the decision
- The stakes involved (what happens if it goes wrong)
- Any constraints or deadlines
- Who else is affected

Rules:
- Ask 1-3 questions maximum
- Each question should be ONE sentence
- Be direct and specific — no filler
- Respond with ONLY a JSON array of question strings, no commentary

Example: ["What is the timeline for this decision?", "Who else on the team would be affected?"]`;

/**
 * Generate the Judge's opening clarifying questions for a new case.
 * Returns 1-3 concise questions.
 */
export async function generateClarifyingQuestions(
  ai: Ai,
  brief: CaseBrief,
): Promise<string[]> {
  const response = await ai.run(MODEL, {
    messages: [
      { role: "system", content: INTAKE_SYSTEM_PROMPT },
      { role: "user", content: brief.text },
    ],
    max_tokens: 512,
    temperature: 0.5,
  });

  const raw = (response as { response: string }).response;
  const jsonStr = raw.replace(/^```json?\s*/, "").replace(/\s*```$/, "").trim();

  try {
    const questions: string[] = JSON.parse(jsonStr);
    return questions.slice(0, 3);
  } catch {
    // Fallback: split by newlines if JSON parsing fails
    return raw
      .split("\n")
      .map((l) => l.replace(/^\d+\.\s*/, "").replace(/^-\s*/, "").trim())
      .filter((l) => l.length > 0 && l.endsWith("?"))
      .slice(0, 3);
  }
}

// ── Mid-debate cross-examination ────────────────────────────────────────────

const CROSS_EXAM_SYSTEM_PROMPT = `You are the Judge in a decision tribunal. The prosecution and defence have just presented their arguments.

Your job is to ask the decision-maker ONE pointed cross-examination question that gets to the heart of the disagreement.

Rules:
- Ask exactly ONE question
- The question should address the key tension between the prosecution and defence arguments
- Be direct and specific
- Respond with ONLY the question text, nothing else`;

/**
 * Generate a cross-examination question based on the tension between
 * the prosecutor's and defender's arguments.
 */
export async function generateCrossExamQuestion(
  ai: Ai,
  brief: CaseBrief,
  clarifications: Clarification[],
  prosecutorArgument: Argument,
  defenderArgument: Argument,
): Promise<string> {
  let userPrompt = `## The Decision\n${brief.text}\n`;

  if (clarifications.length > 0) {
    userPrompt += `\n## Prior Clarifications\n`;
    for (const c of clarifications) {
      userPrompt += `- Q: ${c.question}\n  A: ${c.answer}\n`;
    }
  }

  userPrompt += `\n## Prosecution Argument\n${prosecutorArgument.text}`;
  userPrompt += `\n\n## Defence Argument\n${defenderArgument.text}`;
  userPrompt += `\n\n## Your Task\nAsk ONE cross-examination question to the decision-maker.`;

  const response = await ai.run(MODEL, {
    messages: [
      { role: "system", content: CROSS_EXAM_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 256,
    temperature: 0.5,
  });

  return (response as { response: string }).response.trim();
}
