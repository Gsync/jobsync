import "server-only";

import { tool, type LanguageModel, type UIMessageStreamWriter } from "ai";
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
import {
  runNestedGeneration,
  type NestedGenerationGuard,
} from "@/lib/agent/nestedGeneration";
import type { AgentReviewResumeResult } from "@/models/agent.model";
import type { ResumeReviewData } from "@/models/ai.schemas";

type ReviewResumeContext = {
  userId: string;
  pageResumeId?: string;
  model: LanguageModel;
  provider: string;
  modelName: string;
  writer: UIMessageStreamWriter;
  guard: NestedGenerationGuard;
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

      const generation = await runNestedGeneration({
        model: ctx.model,
        system: RESUME_REVIEW_SYSTEM_PROMPT,
        prompt: buildResumeReviewPrompt(pre.data.normalizedText),
        temperature: TEMPERATURES.FEEDBACK,
        numCtx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
        timeoutMs: APP_CONSTANTS.AI_RESUME_REVIEW_TIMEOUT_MS,
        writer: ctx.writer,
        toolCallId,
        abortSignal,
        guard: ctx.guard,
        label: "review_resume",
      });
      if (generation.status === "busy") {
        return {
          status: "generation_failed",
          title,
          reason: "Another analysis is already running — ask for this one once it finishes.",
        };
      }
      if (generation.status === "incomplete") {
        return {
          status: "generation_failed",
          title,
          reason: "The review stopped before it finished, so nothing was saved.",
        };
      }
      if (generation.status === "failed") {
        return {
          status: "generation_failed",
          title,
          reason: "The review could not be generated. Try again in a moment.",
        };
      }

      const { scores, body } = parseResumeReview(generation.text);
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
