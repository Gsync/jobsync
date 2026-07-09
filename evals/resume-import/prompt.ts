import {
  RESUME_IMPORT_SYSTEM_PROMPT,
  buildResumeImportPrompt,
} from '../../src/lib/ai/prompts/resume-import';

// The real route (src/app/api/ai/resume/import/route.ts) drives these prompts
// through Output.object({ schema: ResumeImportSchema }), which puts the model
// in JSON mode and injects schema/format instructions. We mirror that with the
// provider's response_format: json_object. DeepSeek's JSON mode additionally
// requires the literal word "json" in the messages, so we append that hint —
// the SDK's Output.object injects an equivalent instruction under the hood.
export default function prompt({ vars }: { vars: Record<string, string> }) {
  return [
    { role: 'system', content: RESUME_IMPORT_SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        buildResumeImportPrompt(vars.resumeText) +
        '\n\nReturn the result as a single JSON object.',
    },
  ];
}
