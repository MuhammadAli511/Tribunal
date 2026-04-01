import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Env } from "../env";
import type { AgentRole, Argument, CaseBrief, CaseRecord, Clarification, Verdict } from "../types";
import type { CaseContext } from "./argument-generator";
import { synthesiseSpeechBase64 } from "../voice/elevenlabs-tts";
import { getAgentHint } from "../templates";
import { deliberateJury } from "./jury-deliberation";
import { scoreArgument } from "./sentiment-scorer";

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
    console.log("[Workflow] starting debate for case:", caseId);

    // ── Stubs & config ─────────────────────────────────────────────────────
    const caseDO = this.env.CASE_DO.get(this.env.CASE_DO.idFromString(caseId));
    const judgeDO = this.env.JUDGE_DO.get(this.env.JUDGE_DO.idFromName("judge"));
    const prosecutorDO = this.env.PROSECUTOR_DO.get(this.env.PROSECUTOR_DO.idFromName("prosecutor"));
    const defenderDO = this.env.DEFENDER_DO.get(this.env.DEFENDER_DO.idFromName("defender"));
    const expertDO = this.env.DOMAIN_EXPERT_DO.get(this.env.DOMAIN_EXPERT_DO.idFromName("domain-expert"));
    const historianDO = this.env.HISTORIAN_DO.get(this.env.HISTORIAN_DO.idFromName("historian"));
    const apiKey = this.env.ELEVENLABS_API_KEY;

    // Generate TTS and broadcast argument + audio together so text appears
    // on screen only when the persona starts speaking.
    const speakArgument = async (arg: Argument) => {
      try {
        console.log("[TTS] synthesising for", arg.role, "text length:", arg.text.length);
        const [audioBase64] = await Promise.all([
          synthesiseSpeechBase64(apiKey, arg.text, arg.role),
          scoreArgument(this.env.AI, arg, brief.text).then(async (score) => {
            await callDO(caseDO, "POST", "/broadcast-sentiment", { role: arg.role, score });
          }).catch(() => {}),
        ]);
        console.log("[TTS] got audio for", arg.role, "base64 length:", audioBase64.length);
        await callDO(caseDO, "POST", "/broadcast-speaking", { argument: arg, audioBase64 });
        console.log("[TTS] broadcast done for", arg.role);
      } catch (err) {
        console.error("[TTS] FAILED for", arg.role, err);
        // Fallback: broadcast argument without audio so the text still shows
        await callDO(caseDO, "POST", "/argument", {
          role: arg.role, round: arg.round, text: arg.text, rebuttalTargetId: arg.rebuttalTargetId,
        }).catch(() => {});
      }
    };

    // TTS-only helper for judge text that doesn't come from an Argument
    const speakAs = async (text: string, role: AgentRole) => {
      try {
        console.log("[TTS] synthesising for", role, "text length:", text.length);
        const audioBase64 = await synthesiseSpeechBase64(apiKey, text, role);
        await callDO(caseDO, "POST", "/broadcast-audio", { role, audioBase64 });
      } catch (err) {
        console.error("[TTS] FAILED for", role, err);
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
      templateHint: caseRecord.templateId ? getAgentHint(caseRecord.templateId) : undefined,
    };

    // ── Step 2: Domain Expert argues ──────────────────────────────────────
    console.log("[Workflow] case loaded, brief length:", brief.text.length, "clarifications:", clarifications.length);

    const expertArg = await step.do("domain-expert-argue", async () => {
      const arg = (await callDO(expertDO, "POST", "/argue", {
        caseId,
        caseCtx: baseCaseCtx,
      })) as Argument;

      await callDO(caseDO, "POST", "/argument-silent", {
        role: arg.role, round: arg.round, text: arg.text,
      });

      return arg;
    });

    console.log("[Workflow] expert done, arg length:", expertArg.text.length);
    await step.do("tts-domain-expert", () => speakArgument(expertArg));
    console.log("[Workflow] tts-expert done");

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

      await callDO(caseDO, "POST", "/argument-silent", {
        role: arg.role, round: arg.round, text: arg.text,
      });

      return arg;
    });

    console.log("[Workflow] defender done");
    await step.do("tts-defender", () => speakArgument(defenderArg));

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

      await callDO(caseDO, "POST", "/argument-silent", {
        role: arg.role, round: arg.round, text: arg.text,
      });

      return arg;
    });

    console.log("[Workflow] prosecutor done");
    await step.do("tts-prosecutor", () => speakArgument(prosecutorArg));

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

      await callDO(caseDO, "POST", "/argument-silent", {
        role: arg.role, round: arg.round, text: arg.text,
      });

      return arg;
    });

    console.log("[Workflow] historian done");
    await step.do("tts-historian", () => speakArgument(historianArg));

    // ── Step 6: Judge cross-examines the user ─────────────────────────────

    const { crossExamQuestion, judgeArg } = await step.do("judge-cross-examine", async () => {
      const result = (await callDO(judgeDO, "POST", "/cross-examine", {
        caseId,
        brief,
        clarifications,
        prosecutorArgument: prosecutorArg,
        defenderArgument: defenderArg,
      })) as { question: string };

      // Save silently — text will appear when TTS plays
      const arg = (await callDO(caseDO, "POST", "/argument-silent", {
        role: "judge" as const,
        round,
        text: result.question,
      })) as Argument;

      const crossExamIndex = clarifications.length + 1;
      await callDO(caseDO, "POST", "/clarify", {
        index: crossExamIndex,
        question: result.question,
        answer: "",
      });

      return { crossExamQuestion: result.question, judgeArg: arg };
    });

    console.log("[Workflow] cross-exam question:", crossExamQuestion);
    await step.do("tts-cross-exam", () => speakArgument(judgeArg));

    // Signal cross-exam status so the client opens the response dialog
    await step.do("set-cross-exam-status", async () => {
      await callDO(caseDO, "POST", "/set-status", { status: "cross-exam" });
    });

    // ── Step 7: Wait for user response ────────────────────────────────────
    // The client will post the user's response to CaseDO via /user-response.
    // We sleep and then check if a response arrived.

    console.log("[Workflow] waiting 2min for user response...");
    await step.sleep("wait-for-user-response", "2 minutes");

    // Signal deliberation so the client shows activity while round 2 generates
    await step.do("set-deliberating-status", async () => {
      await callDO(caseDO, "POST", "/set-status", { status: "deliberating" });
    });

    const userResponse = await step.do("check-user-response", async () => {
      const record = (await callDO(caseDO, "GET", "/record")) as CaseRecord;
      // Check for user response in round 1
      const round1 = record.rounds.find((r) => r.round === 1);
      return round1?.userResponse ?? null;
    });

    console.log("[Workflow] user response:", userResponse);

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

      await callDO(caseDO, "POST", "/argument-silent", {
        role: arg.role, round: arg.round, text: arg.text, rebuttalTargetId: defenderArg.id,
      });

      return arg;
    });

    console.log("[Workflow] prosecutor rebuttal done");
    await step.do("tts-prosecutor-rebuttal", () => speakArgument(prosecutorRebuttal));

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

    console.log("[Workflow] verdict:", verdict.ruling);

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

    // ── Step: Jury deliberation ───────────────────────────────────────────
    const juryVerdict = await step.do("jury-deliberation", async () => {
      const allArguments = [...allRound1Args, prosecutorRebuttal];
      return deliberateJury(this.env.AI, {
        brief,
        clarifications,
        allArguments,
        verdict,
      });
    });

    console.log("[Workflow] jury verdict:", juryVerdict.tally);

    await step.do("broadcast-jury-verdict", async () => {
      await callDO(caseDO, "POST", "/jury-verdict", juryVerdict);
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
