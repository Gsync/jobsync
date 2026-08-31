import { z } from "zod";

// Diataxis plus troubleshooting. OKF leaves the type vocabulary open.
export const WIKI_TYPES = [
  "tutorial",
  "how-to",
  "reference",
  "explanation",
  "troubleshooting",
] as const;

// The pre-filter a retrieval layer narrows on before ranking anything.
export const WIKI_FEATURES = [
  "setup",
  "jobs",
  "automations",
  "profile",
  "ai",
  "tasks",
  "questions",
] as const;

export const WIKI_STATUSES = ["draft", "stable", "deprecated"] as const;

// strict(): a typo'd key fails a PR instead of vanishing from a future filter.
export const wikiPageSchema = z
  .object({
    type: z.enum(WIKI_TYPES),
    title: z.string().min(1),
    description: z.string().min(1),
    feature: z.enum(WIKI_FEATURES),
    tags: z.array(z.string().min(1)).min(1),
    aliases: z.array(z.string().min(1)).optional(),
    status: z.enum(WIKI_STATUSES).default("stable"),
    stale_after: z.iso.date().optional(),
  })
  .strict();

// The bundle root carries no type/title/feature, so it needs its own schema
// rather than making every page field optional.
export const wikiIndexSchema = z.object({ okf_version: z.literal("0.2") }).strict();

export type WikiFrontmatter = z.infer<typeof wikiPageSchema>;
