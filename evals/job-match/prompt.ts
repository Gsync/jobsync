import { JOB_MATCH_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/job-match/system';
import { buildJobMatchPrompt } from '../../src/lib/ai/prompts/job-match/user';

export default function prompt({ vars }: { vars: Record<string, string> }) {
  return [
    { role: 'system', content: JOB_MATCH_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildJobMatchPrompt(vars.resumeText, vars.jobDescription),
    },
  ];
}
