export type NormalizedSkillCategory = { label?: string; skills: string[] };

// Skills arrive in varied shapes across models/partials: the documented
// { categories: [{ label, skills }] }, a bare category array, or a flat list of
// skill strings (optionally { name } objects). Normalize all of them to
// categories of non-empty strings so the import card renders regardless of shape.
export function extractSkillCategories(
  raw: unknown,
): NormalizedSkillCategory[] {
  if (!raw) return [];

  const toSkillStrings = (arr: unknown): string[] =>
    (Array.isArray(arr) ? arr : [])
      .map((s) =>
        typeof s === "string"
          ? s
          : typeof (s as any)?.name === "string"
            ? (s as any).name
            : "",
      )
      .map((s) => s.trim())
      .filter(Boolean);

  // Flat list of skill strings -> single unlabeled category
  if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
    const skills = toSkillStrings(raw);
    return skills.length ? [{ skills }] : [];
  }

  const cats = Array.isArray(raw) ? raw : (raw as any).categories;
  if (!Array.isArray(cats)) return [];

  return cats
    .map((cat) => ({
      label: typeof cat?.label === "string" ? cat.label : undefined,
      skills: toSkillStrings(cat?.skills),
    }))
    .filter((c) => c.skills.length > 0);
}
