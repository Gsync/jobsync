import { COVER_LETTER_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/cover-letter/system';
import { buildCoverLetterPrompt } from '../../src/lib/ai/prompts/cover-letter/user';

export default function prompt({ vars }: { vars: Record<string, string> }) {
  return [
    { role: 'system', content: COVER_LETTER_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildCoverLetterPrompt(
        vars.resumeText,
        vars.jobDescription,
        vars.guidance || null,
      ),
    },
  ];
}
