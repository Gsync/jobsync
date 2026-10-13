import { RESUME_REVIEW_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/resume-review/system';
import { buildResumeReviewPrompt } from '../../src/lib/ai/prompts/resume-review/user';
import { JOB_MATCH_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/job-match/system';
import { buildJobMatchPrompt } from '../../src/lib/ai/prompts/job-match/user';
import { COVER_LETTER_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/cover-letter/system';
import { buildCoverLetterPrompt } from '../../src/lib/ai/prompts/cover-letter/user';
import { AGENT_CHAT_SYSTEM_PROMPT } from '../../src/lib/agent/prompt';

// One suite for every generating prompt, selected by vars.task, so a single
// French fixture pair exercises all of them.
export default function prompt({ vars }: { vars: Record<string, string> }) {
  switch (vars.task) {
    case 'review':
      return [
        { role: 'system', content: RESUME_REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: buildResumeReviewPrompt(vars.resumeText) },
      ];
    case 'match':
      return [
        { role: 'system', content: JOB_MATCH_SYSTEM_PROMPT },
        { role: 'user', content: buildJobMatchPrompt(vars.resumeText, vars.jobDescription) },
      ];
    case 'cover-letter':
      return [
        { role: 'system', content: COVER_LETTER_SYSTEM_PROMPT },
        { role: 'user', content: buildCoverLetterPrompt(vars.resumeText, vars.jobDescription, null) },
      ];
    case 'chat':
      return [
        { role: 'system', content: AGENT_CHAT_SYSTEM_PROMPT },
        { role: 'user', content: vars.message },
      ];
    default:
      throw new Error(`unknown task: ${vars.task}`);
  }
}
