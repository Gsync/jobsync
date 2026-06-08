type AssertionResult = { pass: boolean; score: number; reason: string };

// Models often wrap JSON in markdown code fences or add preamble text
function extractJson(output: string): string {
  const trimmed = output.trim();
  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
  if (start === -1 || end === -1) return trimmed;
  return trimmed.slice(start, end + 1);
}

export function assertRequiredFields(output: string): AssertionResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(output));
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  const required = ['achievements', 'keywords', 'actionVerbs', 'atsIssues', 'topImprovements', 'grammarAndSpelling', 'summary'];
  for (const key of required) {
    if (!(key in parsed)) {
      return { pass: false, score: 0, reason: `Missing required field: ${key}` };
    }
  }
  // Accept flat score keys as an alias — models occasionally omit the 'scores' wrapper
  const hasScores = 'scores' in parsed || ('overall' in parsed && 'impact' in parsed);
  if (!hasScores) {
    return { pass: false, score: 0, reason: 'Missing required field: scores' };
  }
  // Accept 'sections' as an alias — models occasionally use it instead of 'sectionFeedback'
  if (!('sectionFeedback' in parsed) && !('sections' in parsed)) {
    return { pass: false, score: 0, reason: 'Missing required field: sectionFeedback' };
  }
  return { pass: true, score: 1, reason: 'All required top-level fields present' };
}

export function assertValidJson(output: string): AssertionResult {
  try {
    JSON.parse(extractJson(output));
    return { pass: true, score: 1, reason: 'Output is valid JSON' };
  } catch (e) {
    return { pass: false, score: 0, reason: `Output is not valid JSON: ${e}` };
  }
}

export function assertScoresInRange(output: string): AssertionResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(output));
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  // Accept flat score keys as an alias — models occasionally omit the 'scores' wrapper
  const scores = (parsed?.scores ?? parsed) as Record<string, unknown>;
  const fields = ['overall', 'impact', 'clarity', 'atsCompatibility'] as const;
  for (const field of fields) {
    const val = scores?.[field];
    if (typeof val !== 'number') {
      return { pass: false, score: 0, reason: `scores.${field} is not a number (got ${typeof val})` };
    }
    if (val < 0 || val > 100) {
      return { pass: false, score: 0, reason: `scores.${field} out of range: ${val}` };
    }
  }
  return { pass: true, score: 1, reason: 'All scores are numbers in range 0-100' };
}

export function assertTopImprovementsCount(output: string): AssertionResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(output));
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  const items = parsed?.topImprovements;
  if (!Array.isArray(items)) {
    return { pass: false, score: 0, reason: 'topImprovements is not an array' };
  }
  if (items.length < 3 || items.length > 5) {
    return { pass: false, score: 0, reason: `topImprovements has ${items.length} items (expected 3-5)` };
  }
  return { pass: true, score: 1, reason: `topImprovements has ${items.length} items` };
}

export function assertSummaryNonEmpty(output: string): AssertionResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(output));
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  const summary = parsed?.summary;
  if (typeof summary !== 'string' || summary.trim().length === 0) {
    return { pass: false, score: 0, reason: 'summary is empty or not a string' };
  }
  return { pass: true, score: 1, reason: 'summary is a non-empty string' };
}

export function assertSectionFeedbackStructure(output: string): AssertionResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(output));
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  // Accept 'sections' as an alias — models occasionally use it instead of 'sectionFeedback'
  const sf = parsed?.sectionFeedback ?? parsed?.sections;
  if (!sf || (typeof sf !== 'object')) {
    return { pass: false, score: 0, reason: 'sectionFeedback is missing or not an object' };
  }

  // Normalize: Zod schema expects array [{section, status, feedback}];
  // without schema enforcement models often return a dict {SectionName: {status, feedback}}
  type SFItem = { section: string; status: unknown; feedback: unknown };
  const items: SFItem[] = Array.isArray(sf)
    ? (sf as Record<string, unknown>[]).map(item => ({ section: item.section as string, status: item.status, feedback: item.feedback }))
    : Object.entries(sf as Record<string, Record<string, unknown>>).map(([k, v]) => ({ section: k, status: v.status, feedback: v.feedback }));

  if (items.length === 0) {
    return { pass: false, score: 0, reason: 'sectionFeedback is empty' };
  }

  const validStatuses = new Set(['good', 'needsWork', 'missing']);
  for (let i = 0; i < items.length; i++) {
    const { section, status, feedback } = items[i];
    if (typeof section !== 'string' || section.trim().length === 0) {
      return { pass: false, score: 0, reason: `sectionFeedback[${i}].section is empty or missing` };
    }
    if (!validStatuses.has(status as string)) {
      return { pass: false, score: 0, reason: `sectionFeedback[${i}].status is invalid: "${status}"` };
    }
    if (typeof feedback !== 'string' || feedback.trim().length === 0) {
      return { pass: false, score: 0, reason: `sectionFeedback[${i}].feedback is empty or missing` };
    }
  }
  return { pass: true, score: 1, reason: `sectionFeedback has ${items.length} valid items` };
}
