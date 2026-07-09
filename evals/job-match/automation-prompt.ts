import { AUTOMATION_JOB_MATCH_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/automation-match/system';
import { buildAutomationJobMatchPrompt } from '../../src/lib/ai/prompts/automation-match/user';

export default function prompt({ vars }: { vars: Record<string, string> }) {
  return [
    { role: 'system', content: AUTOMATION_JOB_MATCH_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildAutomationJobMatchPrompt(vars.resumeText, vars.jobDescription),
    },
  ];
}
