import "server-only";

import { tool, type LanguageModel, type UIMessageStreamWriter } from "ai";
import { TEMPERATURES } from "@/lib/ai/config";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentCoverLetterSchema } from "@/models/agent.schema";
import { resolveJobForAgent } from "@/lib/agent/jobLookup";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { preprocessJob } from "@/lib/ai/tools/preprocessing-job";
import {
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
} from "@/lib/ai/prompts/cover-letter";
import { extractMatchGuidance } from "@/lib/ai/coverLetter/matchGuidance";
import { stripThinking } from "@/lib/ai/stripThinking";
import { generateCoverLetterForJob } from "@/actions/coverLetter.actions";
import {
  runNestedGeneration,
  type NestedGenerationGuard,
} from "@/lib/agent/nestedGeneration";
import type { AgentCoverLetterResult } from "@/models/agent.model";

type CoverLetterContext = {
  userId: string;
  pageJobId?: string;
  model: LanguageModel;
  provider: string;
  modelName: string;
  writer: UIMessageStreamWriter;
  guard: NestedGenerationGuard;
};

/**
 * The third generation surface wearing a tool's clothes, and the first written
 * after nestedGeneration.ts existed — it calls the helper rather than copying
 * reviewResume or matchJob. userId and pageJobId are closure parameters, the
 * same IDOR boundary as the other tools. Unlike its two siblings the output is
 * a plain markdown letter: no SCORES line, no parser, no score card.
 */
export function buildGenerateCoverLetterTool(ctx: CoverLetterContext) {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.generate_cover_letter,
    inputSchema: AgentCoverLetterSchema,
    // No needsApproval: the letter lands in the caller's own documents and
    // they watch the whole thing stream before it does.
    execute: async (raw, { toolCallId, abortSignal }): Promise<AgentCoverLetterResult> => {
      const jobLookup = await resolveJobForAgent(ctx.userId, ctx.pageJobId);
      if (jobLookup.status === "no_job") return { status: "no_job" };

      const job = jobLookup.job;
      const jobTitle = job.JobTitle?.label ?? "this job";
      const company = job.Company?.label ?? "";

      // The retired route's 400: a title-only stub has nothing to write from,
      // and the job page disables the button for the same reason.
      if (job.descriptionCompleteness === "title-only") {
        return { status: "no_description", jobTitle };
      }

      // The job's linked resume takes the pageResumeId slot: a job page has no
      // pageContext.resumeId, and job.resumeId is the closest thing to one.
      const resumeLookup = await resolveResumeForAgent(ctx.userId, {
        title: raw?.resumeTitle,
        pageResumeId: job.resumeId ?? undefined,
      });
      if (resumeLookup.status === "no_resumes") return { status: "no_resumes" };
      if (resumeLookup.status === "needs_selection") {
        return { status: "needs_selection", resumes: resumeLookup.resumes };
      }

      const resume = resumeLookup.resume;
      const [resumePre, jobPre] = await Promise.all([
        preprocessResume(resume),
        preprocessJob(job),
      ]);
      if (!jobPre.success) {
        return {
          status: "unreadable",
          what: "job",
          title: jobTitle,
          reason: "Its description may be too short or missing. Add the full posting and try again.",
        };
      }
      if (!resumePre.success) {
        // Names the section count on purpose: the retired sheet filtered thin
        // resumes out of the picker, and resolveResumeForAgent does not, so
        // this message is now the only place the user learns the floor.
        return {
          status: "unreadable",
          what: "resume",
          title: resume.title,
          reason: `It needs at least ${APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION} sections with real content. Fill it in under Profile → Resumes and try again.`,
        };
      }

      const generation = await runNestedGeneration({
        model: ctx.model,
        system: COVER_LETTER_SYSTEM_PROMPT,
        prompt: buildCoverLetterPrompt(
          resumePre.data.normalizedText,
          jobPre.data.normalizedText,
          extractMatchGuidance(job.matchData),
        ),
        temperature: TEMPERATURES.FEEDBACK,
        numCtx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
        timeoutMs: APP_CONSTANTS.AI_COVER_LETTER_TIMEOUT_MS,
        writer: ctx.writer,
        toolCallId,
        abortSignal,
        guard: ctx.guard,
        label: "generate_cover_letter",
        provider: ctx.provider,
        modelName: ctx.modelName,
        attrs: {
          "jobsync.input.resume_chars": resumePre.data.normalizedText.length,
          "jobsync.input.job_chars": jobPre.data.normalizedText.length,
        },
      });
      if (generation.status === "busy") {
        return {
          status: "generation_failed",
          jobTitle,
          reason: "Another analysis is already running — ask for this one once it finishes.",
        };
      }
      if (generation.status === "incomplete") {
        return {
          status: "generation_failed",
          jobTitle,
          reason: "The letter stopped before it finished, so nothing was saved.",
        };
      }
      if (generation.status === "failed") {
        return {
          status: "generation_failed",
          jobTitle,
          reason: "The letter could not be generated. Try again in a moment.",
        };
      }

      // The same floor generateCoverLetterForJob enforces, checked here so an
      // empty generation reads as a failed letter rather than a failed save.
      const letter = stripThinking(generation.text).trim();
      if (letter.length < APP_CONSTANTS.MIN_COVER_LETTER_CHARS) {
        return {
          status: "generation_failed",
          jobTitle,
          reason: "The letter came back empty, so nothing was saved.",
        };
      }

      const saveResult = await generateCoverLetterForJob(job.id!, letter);
      const saved = saveResult?.success === true;

      return {
        status: "ok",
        jobId: job.id!,
        jobTitle,
        company,
        resumeId: resume.id!,
        resumeTitle: resume.title,
        body: letter,
        coverLetterId: saved ? saveResult.data?.id : undefined,
        coverLetterTitle: saved ? saveResult.data?.title : undefined,
        saved,
        saveError: saved ? undefined : (saveResult?.message ?? "The letter could not be saved."),
      };
    },
  });
}
