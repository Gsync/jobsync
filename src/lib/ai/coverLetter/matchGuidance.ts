const WANTED_SECTIONS = ["Keywords", "Tailoring Tips"];

// Grabs a "## Heading" block up to the next "##" or end of string.
const sectionFor = (body: string, heading: string): string | null => {
  const pattern = new RegExp(
    `^##\\s*${heading}\\s*$([\\s\\S]*?)(?=^##\\s|\\s*$(?![\\s\\S]))`,
    "im",
  );
  const match = body.match(pattern);
  if (!match) return null;
  const content = match[1].trim();
  return content ? `## ${heading}\n${content}` : null;
};

// Pulls only the two actionable sections out of a persisted match analysis.
// The rest (scores, gaps, deal breakers) would push the letter toward
// apologising for weaknesses rather than selling strengths.
export function extractMatchGuidance(
  matchDataRaw: string | null | undefined,
): string | null {
  if (!matchDataRaw) return null;

  let body: unknown;
  try {
    body = (JSON.parse(matchDataRaw) as { body?: unknown }).body;
  } catch {
    return null;
  }
  if (typeof body !== "string" || !body.trim()) return null;

  const sections = WANTED_SECTIONS.map((heading) =>
    sectionFor(body as string, heading),
  ).filter((section): section is string => section !== null);

  if (sections.length === 0) return null;

  return sections.join("\n\n");
}
