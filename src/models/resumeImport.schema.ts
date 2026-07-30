import { z } from "zod";

// Lenient schema: dates as strings, descriptions as plain text.
// Confidence is advisory only — never a gate on acceptance.
const confidence = z.enum(["high", "medium", "low"]).optional();

export const ImportContactInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  confidence,
});

export const ImportExperienceSchema = z.object({
  company: z.string(),
  jobTitle: z.string(),
  location: z.string().optional(),
  // Required (with a "" fallback) rather than .optional() so the model's
  // JSON-schema grammar can't omit the key outright — only leave it empty.
  startDate: z.string().catch(""),
  endDate: z.string().catch(""), // "" / "Present" / "Current" = current job
  description: z.string().catch(""),
  confidence,
});

export const ImportEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().catch(""),
  endDate: z.string().catch(""), // "" / "Present" / "Current" = still enrolled
  description: z.string().catch(""),
  confidence,
});

export const ImportCertificationSchema = z.object({
  title: z.string(),
  organization: z.string().optional(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialUrl: z.string().optional(),
  confidence,
});

// A group of related skills, optionally under a category heading.
// Skill names are plain strings; they resolve to shared Tags on import.
export const ImportSkillCategorySchema = z.object({
  label: z.string().optional(),
  skills: z.array(z.string()).catch([]).default([]),
});

export const ImportSkillsSchema = z.object({
  categories: z.array(ImportSkillCategorySchema).catch([]).default([]),
  confidence,
});

// One unrecognized section, as a plain name. Unknown shapes collapse to ""
// rather than throwing, so a single odd element can't void the whole array.
const unrecognizedSectionName = z
  .union([
    z.string(),
    z
      .object({
        name: z.string().optional(),
        sectionName: z.string().optional(),
        title: z.string().optional(),
        heading: z.string().optional(),
      })
      .transform((o) => o.name ?? o.sectionName ?? o.title ?? o.heading ?? ""),
  ])
  .catch("");

export const ResumeImportSchema = z.object({
  contactInfo: ImportContactInfoSchema.optional(),
  summary: z.string().catch(""),
  // Skills before experience so it streams (and renders) early — long verbatim
  // experience bullets can exhaust a model's output budget before the end.
  skills: ImportSkillsSchema.optional(),
  experience: z.array(ImportExperienceSchema).default([]),
  education: z.array(ImportEducationSchema).default([]),
  certifications: z.array(ImportCertificationSchema).default([]),
  // Models inconsistently return strings or objects here, keying the name as
  // name/sectionName/title/heading. Normalize per element and drop only what
  // yields no name — an array-level .catch turned one unknown shape into a
  // silent [], so the user was never told content had been dropped.
  unrecognizedSections: z
    .array(unrecognizedSectionName)
    .transform((names) => names.filter(Boolean))
    .catch([])
    .default([]),
});

export type ResumeImportData = z.infer<typeof ResumeImportSchema>;
export type ImportContactInfo = z.infer<typeof ImportContactInfoSchema>;
export type ImportExperience = z.infer<typeof ImportExperienceSchema>;
export type ImportEducation = z.infer<typeof ImportEducationSchema>;
export type ImportCertification = z.infer<typeof ImportCertificationSchema>;
export type ImportSkills = z.infer<typeof ImportSkillsSchema>;
