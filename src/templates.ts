import type { TemplateId } from "./types";

const AGENT_HINTS: Record<TemplateId, string> = {
  hiring: "This is a hiring decision. Focus on candidate fit, team impact, hiring risk, and opportunity cost of not hiring.",
  "product-launch": "This is a product launch decision. Focus on market timing, resource cost, competitive risk, and user impact.",
  investment: "This is an investment decision. Focus on risk and return, due diligence, market conditions, and capital allocation.",
  partnership: "This is a partnership decision. Focus on alignment, dependency risk, terms, and alternative options.",
  "strategic-pivot": "This is a strategic pivot decision. Focus on sunk cost, market signals, team readiness, and execution risk.",
  freeform: "",
};

export function getAgentHint(templateId: string): string {
  return AGENT_HINTS[templateId as TemplateId] ?? "";
}
