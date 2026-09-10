import { APP_CONSTANTS } from "@/lib/constants";
import { removeHtmlTags } from "@/lib/ai/tools/text-processing";
import type { ResumeWithSections } from "./types";

export interface SkillTerm {
  tagId: string;
  label: string;
  // Position in the resume's own skill order — the tie-break when two terms
  // occur the same number of times, which is the common case.
  rank: number;
  matcher: RegExp;
}

// Boundaries that keep punctuation-bearing skills intact: "C++", "C#",
// ".NET" and "Node.js" match whole, "Go" never matches inside "going". The
// trailing "." is only a blocker when a word follows it, so a term ending a
// sentence ("We use Go.") still matches.
const BOUNDARY_BEFORE = "(?<![a-z0-9+#.])";
const BOUNDARY_AFTER = "(?![a-z0-9+#]|\\.[a-z0-9])";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A trailing parenthetical annotates the skill, it is not part of its name:
// "Angular (v10-14)" must still match a posting that just says "Angular".
function matchableTerm(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function buildSkillTerms(resume: ResumeWithSections): SkillTerm[] {
  const terms: SkillTerm[] = [];
  const seen = new Set<string>();

  for (const section of resume.ResumeSections) {
    if (section.sectionType !== "skills") continue;
    const ordered = [...section.skills].sort((a, b) => a.order - b.order);
    for (const skill of ordered) {
      const label = skill.Tag?.label?.trim();
      if (!label || !skill.Tag?.id) continue;
      // Dedup on the matchable term, so two labels that differ only inside a
      // parenthetical collapse to one and the earlier resume order wins.
      const key = matchableTerm(label).toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push({
        tagId: skill.Tag.id,
        label,
        rank: terms.length,
        matcher: new RegExp(
          `${BOUNDARY_BEFORE}${escapeRegExp(key)}${BOUNDARY_AFTER}`,
          "g",
        ),
      });
    }
  }

  return terms;
}

export function matchSkillTags(
  title: string,
  description: string,
  terms: SkillTerm[],
): string[] {
  if (terms.length === 0) return [];

  const haystack = removeHtmlTags(`${title}\n${description}`).toLowerCase();
  const hits: Array<{ tagId: string; count: number; rank: number }> = [];

  for (const term of terms) {
    const count = haystack.match(term.matcher)?.length ?? 0;
    if (count > 0) hits.push({ tagId: term.tagId, count, rank: term.rank });
  }

  hits.sort((a, b) => b.count - a.count || a.rank - b.rank);
  return hits.slice(0, APP_CONSTANTS.MAX_JOB_TAGS).map((hit) => hit.tagId);
}
