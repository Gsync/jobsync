import { RESUME_REVIEW_SYSTEM_PROMPT } from '../src/lib/ai/prompts/resume-review/system';
import { buildResumeReviewPrompt } from '../src/lib/ai/prompts/resume-review/user';
import { JOB_MATCH_SYSTEM_PROMPT } from '../src/lib/ai/prompts/job-match/system';
import { buildJobMatchPrompt } from '../src/lib/ai/prompts/job-match/user';
import { AUTOMATION_JOB_MATCH_SYSTEM_PROMPT } from '../src/lib/ai/prompts/automation-match/system';
import { buildAutomationJobMatchPrompt } from '../src/lib/ai/prompts/automation-match/user';
import { RESUME_IMPORT_SYSTEM_PROMPT } from '../src/lib/ai/prompts/resume-import/system';
import { buildResumeImportPrompt } from '../src/lib/ai/prompts/resume-import/user';

// Single prompt entry so every task's test cases render as rows in one table.
// Each test supplies a `task` var selecting which real src prompt to exercise.
export default function prompt({ vars }: { vars: Record<string, string> }) {
  switch (vars.task) {
    case 'resume-review':
      return [
        { role: 'system', content: RESUME_REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: buildResumeReviewPrompt(vars.resumeText) },
      ];
    case 'job-match':
      return [
        { role: 'system', content: JOB_MATCH_SYSTEM_PROMPT },
        { role: 'user', content: buildJobMatchPrompt(vars.resumeText, vars.jobDescription) },
      ];
    case 'automation-match':
      return [
        { role: 'system', content: AUTOMATION_JOB_MATCH_SYSTEM_PROMPT },
        { role: 'user', content: buildAutomationJobMatchPrompt(vars.resumeText, vars.jobDescription) },
      ];
    case 'resume-import':
      // Import rows override the provider to json_object mode (see the combined
      // config), mirroring the route's Output.object; append the JSON hint that
      // DeepSeek's JSON mode requires.
      return [
        { role: 'system', content: RESUME_IMPORT_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            buildResumeImportPrompt(vars.resumeText) +
            '\n\nReturn the result as a single JSON object.',
        },
      ];
    default:
      throw new Error(`Unknown eval task: ${vars.task}`);
  }
}
