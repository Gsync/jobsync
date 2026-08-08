import "server-only";

import { streamText, tool, type LanguageModel, type UIMessageStreamWriter } from "ai";
import { TEMPERATURES } from "@/lib/ai/config";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentReviewResumeSchema } from "@/models/agent.schema";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
} from "@/lib/ai/prompts/resume-review";
import { parseResumeReview } from "@/lib/ai/resumeReview/parse";
import { saveResumeReviewResult } from "@/actions/profile.actions";
import { AGENT_NESTED_STREAM_PART_TYPE } from "@/models/agent.model";
import type { AgentReviewResumeResult } from "@/models/agent.model";
import type { ResumeReviewData } from "@/models/ai.schemas";

type ReviewResumeContext = {
  userId: string;
  pageResumeId?: string;
  model: LanguageModel;
  provider: string;
  modelName: string;
  writer: UIMessageStreamWriter;
};

/**
 * A second generation surface wearing a tool's clothes. execute makes its own
 * streamText call with the dedicated review route's exact inputs, so parity is
 * true by construction rather than by two prompts agreeing. userId and
 * pageResumeId are closure parameters — the same IDOR boundary as the other
 * tools, and it has a dedicated test.
 */
export function buildReviewResumeTool(ctx: ReviewResumeContext) {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.review_resume,
    inputSchema: AgentReviewResumeSchema,
    // No needsApproval: this writes only the caller's own reviewData, and
    // they watch the whole thing stream before it lands.
    execute: async (raw, { toolCallId, abortSignal }): Promise<AgentReviewResumeResult> => {
      const lookup = await resolveResumeForAgent(ctx.userId, {
        title: raw?.resumeTitle,
        pageResumeId: ctx.pageResumeId,
      });

      if (lookup.status === "no_resumes") return { status: "no_resumes" };
      if (lookup.status === "needs_selection") {
        return { status: "needs_selection", resumes: lookup.resumes };
      }

      const title = lookup.resume.title;
      const pre = await preprocessResume(lookup.resume);
      if (!pre.success) {
        return {
          status: "unreadable",
          title,
          reason: "It may be too short or missing content. Check it in Profile → Resumes.",
        };
      }

      // Own deadline, plus the outer turn's signal so closing the panel
      // aborts this too.
      const signals: AbortSignal[] = [
        AbortSignal.timeout(APP_CONSTANTS.AI_RESUME_REVIEW_TIMEOUT_MS),
      ];
      if (abortSignal) signals.push(abortSignal);

      let generated = "";
      try {
        const sub = streamText({
          model: ctx.model,
          system: RESUME_REVIEW_SYSTEM_PROMPT,
          prompt: buildResumeReviewPrompt(pre.data.normalizedText),
          temperature: TEMPERATURES.FEEDBACK,
          abortSignal: AbortSignal.any(signals),
          // Deliberately no think:true. This is a plain text generation with
          // no tools, so reasoning buys nothing and costs 30s on a call that
          // already runs 30-120s. The chat loop enables it; this does not.
          providerOptions: {
            ollama: { options: { num_ctx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX } },
          },
        });

        for await (const delta of sub.textStream) {
          generated += delta;
          ctx.writer.write({
            type: AGENT_NESTED_STREAM_PART_TYPE,
            id: toolCallId,
            data: { delta },
            transient: true,
          });
        }

        // The stream running out is not the generation finishing, and neither
        // case throws: an abort (the user closing the panel) ends textStream
        // cleanly and rejects this promise, and a response body that stops
        // without Ollama's done chunk resolves it to "other". The SCORES line
        // is the first thing emitted, so both leave a fragment that parses.
        const finishReason = await sub.finishReason;
        if (finishReason !== "stop") {
          return {
            status: "generation_failed",
            title,
            reason: "The review stopped before it finished, so nothing was saved.",
          };
        }
      } catch (error) {
        console.error("[agent-chat] review_resume generation failed:", error);
        return {
          status: "generation_failed",
          title,
          reason: "The review could not be generated. Try again in a moment.",
        };
      }

      const { scores, body } = parseResumeReview(generated);
      // reviewData is overwrite-only with no history, so an unscored or
      // half-finished generation must not be written.
      if (!scores) {
        return {
          status: "generation_failed",
          title,
          reason: "The review came back without a scores line, so nothing was saved.",
        };
      }

      const reviewData: ResumeReviewData = {
        ...scores,
        body,
        reviewedAt: new Date().toISOString(),
        provider: ctx.provider,
        model: ctx.modelName,
        surface: APP_CONSTANTS.AGENT_CHAT_REVIEW_SURFACE,
      };
      const saveResult = await saveResumeReviewResult(
        lookup.resume.id!,
        JSON.stringify(reviewData),
      );
      const saved = saveResult?.success === true;

      return {
        status: "ok",
        resumeId: lookup.resume.id!,
        title,
        scores,
        body,
        saved,
        saveError: saved ? undefined : (saveResult?.message ?? "The review could not be saved."),
      };
    },
  });
}
