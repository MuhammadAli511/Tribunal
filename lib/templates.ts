import type { DecisionTemplate } from "@/src/types";

export const TEMPLATES: DecisionTemplate[] = [
  {
    id: "hiring",
    name: "Hiring Decision",
    description: "Should we hire this candidate?",
    icon: "UserPlus",
    systemPromptModifier:
      "This case is about a hiring decision. Focus your 3 questions on: role fit and team dynamics, compensation and budget constraints, and culture or long-term growth concerns.",
    agentHint:
      "This is a hiring decision. Focus on candidate fit, team impact, hiring risk, and opportunity cost of not hiring.",
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Should we ship this feature or product?",
    icon: "Rocket",
    systemPromptModifier:
      "This case is about a product launch decision. Focus your 3 questions on: market timing and competitive landscape, resource and engineering cost, and user impact or revenue expectations.",
    agentHint:
      "This is a product launch decision. Focus on market timing, resource cost, competitive risk, and user impact.",
  },
  {
    id: "investment",
    name: "Investment",
    description: "Should we invest in this opportunity?",
    icon: "TrendingUp",
    systemPromptModifier:
      "This case is about an investment decision. Focus your 3 questions on: expected return and risk profile, due diligence gaps, and portfolio or budget fit.",
    agentHint:
      "This is an investment decision. Focus on risk and return, due diligence, market conditions, and capital allocation.",
  },
  {
    id: "partnership",
    name: "Partnership",
    description: "Should we partner with this company?",
    icon: "Handshake",
    systemPromptModifier:
      "This case is about a partnership decision. Focus your 3 questions on: strategic alignment and shared goals, terms and dependency risk, and exit or fallback options.",
    agentHint:
      "This is a partnership decision. Focus on alignment, dependency risk, terms, and alternative options.",
  },
  {
    id: "strategic-pivot",
    name: "Strategic Pivot",
    description: "Should we change direction?",
    icon: "RefreshCw",
    systemPromptModifier:
      "This case is about a strategic pivot. Focus your 3 questions on: what signals are driving the pivot, sunk cost and team readiness, and what the new direction looks like concretely.",
    agentHint:
      "This is a strategic pivot decision. Focus on sunk cost, market signals, team readiness, and execution risk.",
  },
  {
    id: "freeform",
    name: "Freeform",
    description: "Describe any decision",
    icon: "MessageSquare",
    systemPromptModifier: "",
    agentHint: "",
  },
];

export function getTemplate(id: string): DecisionTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
