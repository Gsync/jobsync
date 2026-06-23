import { RESUME_REVIEW_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/resume-review/system';
import { buildResumeReviewPrompt } from '../../src/lib/ai/prompts/resume-review/user';

export default function prompt({ vars }: { vars: Record<string, string> }) {
  return [
    { role: 'system', content: RESUME_REVIEW_SYSTEM_PROMPT },
    { role: 'user', content: buildResumeReviewPrompt(vars.resumeText) },
  ];
}
