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
  startDate: z.string().optional(),
  endDate: z.string().optional(), // null / "Present" / "Current" = current job
  description: z.string().catch(""),
  confidence,
});

export const ImportEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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

export const ResumeImportSchema = z.object({
  contactInfo: ImportContactInfoSchema.optional(),
  summary: z.string().catch(""),
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
