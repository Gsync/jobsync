const MAX_TITLE_LENGTH = 100;

// Matches a trailing " (Copy)" / " (Copy 3)" so copying a copy does not nest
const COPY_SUFFIX = /\s*\(copy(?:\s+\d+)?\)$/i;

const normalize = (value: string): string => value.trim().toLowerCase();

// Trim the base so `${base}${suffix}` still fits the title column limit
const fit = (base: string, suffix: string): string => {
  const room = MAX_TITLE_LENGTH - suffix.length;
  return `${base.slice(0, Math.max(room, 0)).trimEnd()}${suffix}`;
};

export const buildCopyTitle = (
  sourceTitle: string,
  takenTitles: string[],
): string => {
  const base = sourceTitle.trim().replace(COPY_SUFFIX, "").trim();
  const taken = new Set(takenTitles.map(normalize));

  let candidate = fit(base, " (Copy)");
  let counter = 2;
  while (taken.has(normalize(candidate))) {
    candidate = fit(base, ` (Copy ${counter++})`);
  }
  return candidate;
};

export const ensureUniqueTitle = (
  desiredTitle: string,
  takenTitles: string[],
): string => {
  const base = desiredTitle.trim();
  const taken = new Set(takenTitles.map(normalize));

  let candidate = fit(base, "");
  let counter = 2;
  while (taken.has(normalize(candidate))) {
    candidate = fit(base, ` (${counter++})`);
  }
  return candidate;
};
