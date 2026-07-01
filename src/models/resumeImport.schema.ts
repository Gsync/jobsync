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

export const ResumeImportSchema = z.object({
  contactInfo: ImportContactInfoSchema.optional(),
  summary: z.string().catch(""),
  // Skills before experience so it streams (and renders) early — long verbatim
  // experience bullets can exhaust a model's output budget before the end.
  skills: ImportSkillsSchema.optional(),
  experience: z.array(ImportExperienceSchema).default([]),
  education: z.array(ImportEducationSchema).default([]),
  certifications: z.array(ImportCertificationSchema).default([]),
  // Models inconsistently return strings or { name } objects here — accept both
  // and normalize to strings. .catch keeps this non-critical field from ever
  // failing whole-object validation.
  unrecognizedSections: z
    .array(
      z.union([
        z.string(),
        z.object({ name: z.string() }).transform((o) => o.name),
      ]),
    )
    .catch([])
    .default([]),
});

export type ResumeImportData = z.infer<typeof ResumeImportSchema>;
export type ImportContactInfo = z.infer<typeof ImportContactInfoSchema>;
export type ImportExperience = z.infer<typeof ImportExperienceSchema>;
export type ImportEducation = z.infer<typeof ImportEducationSchema>;
export type ImportCertification = z.infer<typeof ImportCertificationSchema>;
export type ImportSkills = z.infer<typeof ImportSkillsSchema>;
