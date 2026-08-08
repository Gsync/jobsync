import "server-only";

import { tool, type LanguageModel, type UIMessageStreamWriter } from "ai";
import { TEMPERATURES } from "@/lib/ai/config";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentMatchJobSchema } from "@/models/agent.schema";
import { resolveJobForAgent } from "@/lib/agent/jobLookup";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { preprocessJob } from "@/lib/ai/tools/preprocessing-job";
import {
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
} from "@/lib/ai/prompts/job-match";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";
import { saveJobMatchResult } from "@/actions/job.actions";
import {
  runNestedGeneration,
  type NestedGenerationGuard,
} from "@/lib/agent/nestedGeneration";
import type { AgentMatchJobResult } from "@/models/agent.model";
import type { JobMatchData } from "@/models/ai.schemas";

type MatchJobContext = {
  userId: string;
  pageJobId?: string;
  model: LanguageModel;
  provider: string;
  modelName: string;
  writer: UIMessageStreamWriter;
  guard: NestedGenerationGuard;
};

/**
 * The second generation surface wearing a tool's clothes, after review_resume.
 * execute makes its own streamText call with the retired match route's exact
 * inputs, so parity is true by construction. userId and pageJobId are closure
 * parameters — the same IDOR boundary as the other tools.
 */
export function buildMatchJobTool(ctx: MatchJobContext) {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.match_job,
    inputSchema: AgentMatchJobSchema,
    // No needsApproval: this writes only matchData on the caller's own job,
    // and they watch the whole thing stream before it lands.
    execute: async (raw, { toolCallId, abortSignal }): Promise<AgentMatchJobResult> => {
      const jobLookup = await resolveJobForAgent(ctx.userId, ctx.pageJobId);
      if (jobLookup.status === "no_job") return { status: "no_job" };

      const job = jobLookup.job;
      const jobTitle = job.JobTitle?.label ?? "this job";
      const company = job.Company?.label ?? "";

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
        return {
          status: "unreadable",
          what: "resume",
          title: resume.title,
          reason: "It may be too short or missing content. Check it in Profile → Resumes.",
        };
      }

      const generation = await runNestedGeneration({
        model: ctx.model,
        system: JOB_MATCH_SYSTEM_PROMPT,
        prompt: buildJobMatchPrompt(
          resumePre.data.normalizedText,
          jobPre.data.normalizedText,
        ),
        temperature: TEMPERATURES.FEEDBACK,
        numCtx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
        timeoutMs: APP_CONSTANTS.AI_JOB_MATCH_TIMEOUT_MS,
        writer: ctx.writer,
        toolCallId,
        abortSignal,
        guard: ctx.guard,
        label: "match_job",
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
          reason: "The analysis stopped before it finished, so nothing was saved.",
        };
      }
      if (generation.status === "failed") {
        return {
          status: "generation_failed",
          jobTitle,
          reason: "The match could not be generated. Try again in a moment.",
        };
      }

      const { scores, body } = parseJobMatch(generation.text);
      // matchData is overwrite-only with no history, so an unscored or
      // half-finished generation must not be written.
      if (!scores) {
        return {
          status: "generation_failed",
          jobTitle,
          reason: "The match came back without a scores line, so nothing was saved.",
        };
      }

      const matchData: JobMatchData = {
        ...scores,
        body,
        resumeId: resume.id!,
        resumeTitle: resume.title,
        matchedAt: new Date().toISOString(),
        provider: ctx.provider,
        model: ctx.modelName,
        surface: APP_CONSTANTS.AGENT_CHAT_MATCH_SURFACE,
      };
      const saveResult = await saveJobMatchResult(
        job.id!,
        scores.matchScore,
        JSON.stringify(matchData),
      );
      const saved = saveResult?.success === true;

      return {
        status: "ok",
        jobId: job.id!,
        jobTitle,
        company,
        resumeId: resume.id!,
        resumeTitle: resume.title,
        scores,
        body,
        saved,
        saveError: saved ? undefined : (saveResult?.message ?? "The match could not be saved."),
      };
    },
  });
}
