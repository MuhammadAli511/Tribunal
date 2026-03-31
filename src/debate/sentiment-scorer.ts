import type { Argument } from "../types";
import { extractAIText } from "./argument-generator";

const MODEL = "@cf/openai/gpt-oss-120b" as const;

const SYSTEM_PROMPT = `You are a sentiment analyzer for a decision tribunal debate. Given an argument, rate its persuasive impact on the decision.

Respond with ONLY a single number between -1.0 and 1.0:
- Positive (0.1 to 1.0): argument supports proceeding with the decision
- Negative (-1.0 to -0.1): argument argues against proceeding
- Near zero (-0.1 to 0.1): neutral or balanced argument

Respond with ONLY the number. No text, no explanation.`;

export async function scoreArgument(
  ai: Ai,
  argument: Argument,
  briefText: string,
): Promise<number> {
  try {
    const response = await ai.run(MODEL, {
      instructions: SYSTEM_PROMPT,
      input: `Decision: ${briefText}\n\nArgument by ${argument.role}:\n${argument.text}\n\nScore:`,
      max_tokens: 10,
      temperature: 0.1,
      reasoning: { effort: "low" },
    } as Record<string, unknown>);

    const raw = extractAIText(response).trim();
    const score = parseFloat(raw);
    if (isNaN(score)) return 0;
    return Math.max(-1, Math.min(1, score));
  } catch {
    return 0;
  }
}
