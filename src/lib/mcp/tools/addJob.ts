import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";
import { McpAddJobSchema } from "@/models/mcp.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";

export const addJobToolDefinition = {
  name: "add_job",
  description:
    "Add a job application to JobSync. Resolves or creates company, job title, location, and source by name. Returns a transparency report of what was matched vs. created.",
  inputSchema: McpAddJobSchema,
} as const;

function buildMatchDirective(
  jobId: string,
  resumeId: string,
  normalizedResumeText: string,
): string {
  return (
    `You just added a job to JobSync (job id: ${jobId}). Produce a job-fit ` +
    `match of this job against the user's default resume, shown below.\n\n` +
    `DEFAULT RESUME (normalized):\n${normalizedResumeText}\n\n` +
    `INSTRUCTIONS:\n` +
    `- Analyze fit between the resume above and the job description you just\n` +
    `  submitted in this same add_job call.\n` +
    `- Use ONLY the resume and that job description. Do not invent employers,\n` +
    `  skills, titles, dates, or credentials that are not present in them.\n` +
    `- Score honestly. If the resume lacks the information needed to judge fit,\n` +
    `  still emit a SCORES line with a low score and a "weak" recommendation and\n` +
    `  say what is missing — do NOT fabricate a match.\n` +
    `- Produce, in this exact order:\n` +
    `    1. A single first line, exactly:\n` +
    `       SCORES: match=<0-100> recommendation=<strong|good|partial|weak>\n` +
    `    2. A markdown body with these four sections, each at least a few\n` +
    `       sentences of specific, evidence-based analysis (cite concrete\n` +
    `       skills, titles, and years from the resume and job description):\n` +
    `       ## Overall Fit\n` +
    `       ## Key Strengths\n` +
    `       ## Gaps / Risks\n` +
    `       ## Recommendation\n` +
    `- Then call save_match_result with:\n` +
    `    { "jobId": "${jobId}", "resumeId": "${resumeId}", "matchText": "<the full SCORES line + markdown body>" }`
  );
}

export async function handleAddJob(
  input: z.infer<typeof McpAddJobSchema>,
  userId: string,
  tokenName: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const result = await createJobFromNames(
      { ...input, createdVia: tokenName },
      userId,
    );

    if (!result.created || !result.jobId) {
      const text =
        result.message +
        " No match offered for duplicates — you can match it in the web app.";
      return { content: [{ type: "text", text }] };
    }

    if (input.jobDescription.length < APP_CONSTANTS.MCP_MATCH_MIN_DESCRIPTION_LENGTH) {
      const text =
        result.message +
        " Description too short to match (under 200 characters) — the job was still added.";
      return { content: [{ type: "text", text }] };
    }

    const resume = await getDefaultResumeForUser(userId);
    if (!resume) {
      const text =
        result.message +
        " No default resume set — set one in Profile → Resumes to enable automatic matching.";
      return { content: [{ type: "text", text }] };
    }

    const pre = await preprocessResume(resume);
    if (!pre.success) {
      const text =
        result.message +
        " Default resume couldn't be used for matching (it may be too short or missing content) — check it in Profile → Resumes.";
      return { content: [{ type: "text", text }] };
    }

    const directive = buildMatchDirective(
      result.jobId,
      resume.id!,
      pre.data.normalizedText,
    );
    return { content: [{ type: "text", text: `${result.message}\n\n${directive}` }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}
