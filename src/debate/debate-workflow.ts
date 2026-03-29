import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Env } from "../env";
import type { AgentRole, Argument, CaseBrief, CaseRecord, Clarification, Verdict } from "../types";
import type { CaseContext } from "./argument-generator";
import { synthesiseSpeechBase64 } from "../voice/elevenlabs-tts";

// ── Workflow params ─────────────────────────────────────────────────────────

export interface DebateParams {
  caseId: string;
}

// ── Helper: call a DO endpoint and parse JSON response ──────────────────────

async function callDO(
  stub: DurableObjectStub,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await stub.fetch(new Request(`http://do${path}`, init));
  if (!res.ok) throw new Error(`DO call ${method} ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * DebateWorkflow — Cloudflare Workflow that orchestrates a full tribunal debate.
 *
 * Step order:
 *   1. Load case record from CaseDO
 *   2. Domain Expert argues (neutral facts)
 *   3. Defender argues (steelman)
 *   4. Prosecutor argues (adversarial)
 *   5. Historian argues (pattern-aware)
 *   6. Judge generates cross-examination question
 *   7. Wait for user response
 *   8. Prosecutor rebuttal
 *   9. Judge synthesises verdict
 *  10. Record verdict in CaseDO and HistorianDO
 *
 * Each step is durable — if the worker crashes, execution resumes from the
 * last completed step.
 */
export class DebateWorkflow extends WorkflowEntrypoint<Env, DebateParams> {
  async run(event: WorkflowEvent<DebateParams>, step: WorkflowStep) {
    const { caseId } = event.payload;

    // ── Stubs & config ─────────────────────────────────────────────────────
    const caseDO = this.env.CASE_DO.get(this.env.CASE_DO.idFromString(caseId));
    const judgeDO = this.env.JUDGE_DO.get(this.env.JUDGE_DO.idFromName("judge"));
    const prosecutorDO = this.env.PROSECUTOR_DO.get(this.env.PROSECUTOR_DO.idFromName("prosecutor"));
    const defenderDO = this.env.DEFENDER_DO.get(this.env.DEFENDER_DO.idFromName("defender"));
    const expertDO = this.env.DOMAIN_EXPERT_DO.get(this.env.DOMAIN_EXPERT_DO.idFromName("domain-expert"));
    const historianDO = this.env.HISTORIAN_DO.get(this.env.HISTORIAN_DO.idFromName("historian"));
    const apiKey = this.env.ELEVENLABS_API_KEY;

    // TTS helper — synthesise speech and broadcast audio to connected clients
    const speakAs = async (text: string, role: AgentRole) => {
      try {
        const audioBase64 = await synthesiseSpeechBase64(apiKey, text, role);
        await callDO(caseDO, "POST", "/broadcast-audio", { role, audioBase64 });
      } catch {
        // TTS failure is non-fatal — argument text is still delivered
      }
    };

    // ── Step 1: Load case record ──────────────────────────────────────────

    const caseRecord = await step.do("load-case", async () => {
      return (await callDO(caseDO, "GET", "/record")) as CaseRecord;
    });

    const brief: CaseBrief = caseRecord.brief;
    const clarifications: Clarification[] = caseRecord.clarifications;
    const round = 1;

    // Build base context (no prior arguments for round 1)
    const baseCaseCtx: CaseContext = {
      brief,
      clarifications,
      priorArguments: [],
      round,
    };

    // ── Step 2: Domain Expert argues ──────────────────────────────────────

    const expertArg = await step.do("domain-expert-argue", async () => {
      const arg = (await callDO(expertDO, "POST", "/argue", {
        caseId,
        caseCtx: baseCaseCtx,
      })) as Argument;

      // Post argument to CaseDO for storage + broadcast
      await callDO(caseDO, "POST", "/argument", {
        role: arg.role,
        round: arg.round,
        text: arg.text,
      });

      return arg;
    });

    await step.do("tts-domain-expert", () => speakAs(expertArg.text, "domain-expert"));

    // ── Step 3: Defender argues ───────────────────────────────────────────

    const defenderArg = await step.do("defender-argue", async () => {
      const ctx: CaseContext = {
        ...baseCaseCtx,
        priorArguments: [expertArg],
      };

      const arg = (await callDO(defenderDO, "POST", "/argue", {
        caseId,
        caseCtx: ctx,
      })) as Argument;

      await callDO(caseDO, "POST", "/argument", {
        role: arg.role,
        round: arg.round,
        text: arg.text,
      });

      return arg;
    });

    await step.do("tts-defender", () => speakAs(defenderArg.text, "defender"));

    // ── Step 4: Prosecutor argues ─────────────────────────────────────────

    const prosecutorArg = await step.do("prosecutor-argue", async () => {
      const ctx: CaseContext = {
        ...baseCaseCtx,
        priorArguments: [expertArg, defenderArg],
      };

      const arg = (await callDO(prosecutorDO, "POST", "/argue", {
        caseId,
        caseCtx: ctx,
      })) as Argument;

      await callDO(caseDO, "POST", "/argument", {
        role: arg.role,
        round: arg.round,
        text: arg.text,
      });

      return arg;
    });

    await step.do("tts-prosecutor", () => speakAs(prosecutorArg.text, "prosecutor"));

    // ── Step 5: Historian argues ──────────────────────────────────────────

    const historianArg = await step.do("historian-argue", async () => {
      const ctx: CaseContext = {
        ...baseCaseCtx,
        priorArguments: [expertArg, defenderArg, prosecutorArg],
      };

      const arg = (await callDO(historianDO, "POST", "/argue", {
        caseId,
        caseCtx: ctx,
      })) as Argument;

      await callDO(caseDO, "POST", "/argument", {
        role: arg.role,
        round: arg.round,
        text: arg.text,
      });

      return arg;
    });

    await step.do("tts-historian", () => speakAs(historianArg.text, "historian"));

    // ── Step 6: Judge cross-examines the user ─────────────────────────────

    const crossExamQuestion = await step.do("judge-cross-examine", async () => {
      // Update status to cross-exam
      await callDO(caseDO, "POST", "/argument", {
        role: "judge" as const,
        round,
        text: "", // placeholder — the real question goes via cross-exam
      }).catch(() => {}); // ignore if this fails

      const result = (await callDO(judgeDO, "POST", "/cross-examine", {
        caseId,
        brief,
        clarifications,
        prosecutorArgument: prosecutorArg,
        defenderArgument: defenderArg,
      })) as { question: string };

      // Store cross-exam as a clarification on CaseDO and broadcast
      const crossExamIndex = clarifications.length + 1;
      await callDO(caseDO, "POST", "/clarify", {
        index: crossExamIndex,
        question: result.question,
        answer: "", // pending user response
      });

      return result.question;
    });

    await step.do("tts-cross-exam", () => speakAs(crossExamQuestion, "judge"));

    // ── Step 7: Wait for user response ────────────────────────────────────
    // The client will post the user's response to CaseDO via /user-response.
    // We sleep and then check if a response arrived.

    await step.sleep("wait-for-user-response", "2 minutes");

    const userResponse = await step.do("check-user-response", async () => {
      const record = (await callDO(caseDO, "GET", "/record")) as CaseRecord;
      // Check for user response in round 1
      const round1 = record.rounds.find((r) => r.round === 1);
      return round1?.userResponse ?? null;
    });

    // ── Step 8: Prosecutor rebuttal (round 2) ─────────────────────────────

    const allRound1Args = [expertArg, defenderArg, prosecutorArg, historianArg];

    const prosecutorRebuttal = await step.do("prosecutor-rebuttal", async () => {
      const rebuttalCtx: CaseContext = {
        brief,
        clarifications: userResponse
          ? [...clarifications, { question: crossExamQuestion, answer: userResponse, index: clarifications.length + 1 }]
          : clarifications,
        priorArguments: allRound1Args,
        round: 2,
      };

      const arg = (await callDO(prosecutorDO, "POST", "/argue", {
        caseId,
        caseCtx: rebuttalCtx,
        rebuttalTargetId: defenderArg.id,
      })) as Argument;

      await callDO(caseDO, "POST", "/argument", {
        role: arg.role,
        round: arg.round,
        text: arg.text,
        rebuttalTargetId: defenderArg.id,
      });

      return arg;
    });

    await step.do("tts-prosecutor-rebuttal", () => speakAs(prosecutorRebuttal.text, "prosecutor"));

    // ── Step 9: Judge synthesises verdict ──────────────────────────────────

    const verdict = await step.do("judge-verdict", async () => {
      const allArguments = [...allRound1Args, prosecutorRebuttal];

      const v = (await callDO(judgeDO, "POST", "/verdict", {
        caseId,
        input: {
          brief,
          clarifications,
          allArguments,
        },
      })) as Verdict;

      // Post verdict to CaseDO — sets status to "verdict" and broadcasts
      await callDO(caseDO, "POST", "/verdict", {
        ruling: v.ruling,
        keyFactors: v.keyFactors,
        conditions: v.conditions,
        dissent: v.dissent,
      });

      return v;
    });

    // Speak the verdict aloud as the Judge
    await step.do("tts-verdict", async () => {
      const verdictText = [
        `My ruling is: ${verdict.ruling}.`,
        `The key factors in this decision were: ${verdict.keyFactors.join(". ")}.`,
        verdict.conditions.length > 0
          ? `For this ruling to change: ${verdict.conditions.join(". ")}.`
          : "",
        `In dissent, I note: ${verdict.dissent}.`,
      ]
        .filter(Boolean)
        .join(" ");
      await speakAs(verdictText, "judge");
    });

    // ── Step 10: Record case in Historian for future reference ─────────────

    await step.do("record-in-historian", async () => {
      const briefSnippet = brief.text.length > 200
        ? brief.text.slice(0, 197) + "..."
        : brief.text;

      const summary = [
        `Decision: ${briefSnippet}`,
        `Ruling: ${verdict.ruling}`,
        `Key factors: ${verdict.keyFactors.join("; ")}`,
        verdict.dissent ? `Dissent: ${verdict.dissent}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      await callDO(historianDO, "POST", "/record-verdict", {
        caseId,
        briefSnippet,
        ruling: verdict.ruling,
        summary,
      });
    });

    return { caseId, ruling: verdict.ruling };
  }
}
