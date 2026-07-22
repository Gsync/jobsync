import { APP_CONSTANTS } from "@/lib/constants";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import type { DescriptionCompleteness } from "@/models/job.model";

export function buildMatchDirective(
  jobId: string,
  resumeId: string,
  normalizedResumeText: string,
  completeness: DescriptionCompleteness,
  context: "add" | "update",
): string {
  const source =
    context === "add"
      ? "the job description you just submitted in this same add_job call"
      : "the job description now stored on this job (as just updated)";

  const warning =
    completeness === "partial"
      ? `\n\nPARTIAL DESCRIPTION WARNING: this posting is under ` +
        `${APP_CONSTANTS.DESCRIPTION_FULL_MIN_WORDS} words, so any score you ` +
        `produce is provisional and will be labelled as such in JobSync. Weight ` +
        `your confidence accordingly, say plainly in the body what the ` +
        `description does not tell you, and if you can fetch the full posting, ` +
        `call update_job with it first and score the enriched version instead.`
      : "";

  return (
    `Produce a job-fit match of JobSync job id ${jobId} against the user's ` +
    `default resume, shown below.${warning}\n\n` +
    `DEFAULT RESUME (normalized):\n${normalizedResumeText}\n\n` +
    `INSTRUCTIONS:\n` +
    `- Analyze fit between the resume above and ${source}.\n` +
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

// Decides whether a match is offered at all, and returns either the
// directive or the one-line note explaining why not. Callers append a
// "directive" with a blank line and a "note" with a single space.
export async function buildMatchOffer(
  jobId: string,
  userId: string,
  completeness: DescriptionCompleteness,
  context: "add" | "update",
): Promise<{ kind: "directive" | "note"; text: string }> {
  if (completeness === "title-only") {
    return {
      kind: "note",
      text:
        `The description is too thin to score (under ` +
        `${APP_CONSTANTS.DESCRIPTION_PARTIAL_MIN_WORDS} words) — the job was ` +
        `saved, but no fit analysis was requested. Fetch the full posting and ` +
        `call update_job with jobId "${jobId}" to get one.`,
    };
  }

  const resume = await getDefaultResumeForUser(userId);
  if (!resume) {
    return {
      kind: "note",
      text: "No default resume set — set one in Profile → Resumes to enable automatic matching.",
    };
  }

  const pre = await preprocessResume(resume);
  if (!pre.success) {
    return {
      kind: "note",
      text: "Default resume couldn't be used for matching (it may be too short or missing content) — check it in Profile → Resumes.",
    };
  }

  return {
    kind: "directive",
    text: buildMatchDirective(
      jobId,
      resume.id!,
      pre.data.normalizedText,
      completeness,
      context,
    ),
  };
}

// Shared by add_job and update_job so both compose the offer identically.
export function composeOfferMessage(
  message: string,
  offer: { kind: "directive" | "note"; text: string },
): string {
  return offer.kind === "directive"
    ? `${message}\n\n${offer.text}`
    : `${message} ${offer.text}`;
}
