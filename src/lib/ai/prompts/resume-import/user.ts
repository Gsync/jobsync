export function buildResumeImportPrompt(normalizedText: string): string {
  return `Parse the following resume and extract structured data.

<resume>
${normalizedText}
</resume>

Return only the structured resume data described in your instructions.`;
}
