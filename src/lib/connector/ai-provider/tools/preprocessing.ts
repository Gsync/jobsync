/**
 * Resume Preprocessing Module
 * Normalizes text, detects sections, extracts metadata, and validates resume content
 * Uses shared text processing utilities from text-processing.ts
 */

import {
  ContactInfo,
  Education,
  Resume,
  ResumeSection,
  SectionType,
  WorkExperience,
} from "@/models/profile.model";
import {
  removeHtmlTags,
  normalizeWhitespace,
  normalizeBullets,
  normalizeHeadings,
  extractMetadata,
  validateText,
  type TextMetadata,
} from "./text-processing";

// TYPES

export type ResumeMetadata = TextMetadata;

export interface PreprocessedResume {
  normalizedText: string;
  metadata: ResumeMetadata;
  isValid: boolean;
}

export type PreprocessingResult =
  | { success: true; data: PreprocessedResume }
  | {
      success: false;
      error: { code: string; message: string; details?: object };
    };

// VALIDATION THRESHOLDS

const MIN_CHAR_COUNT = 200;
const MAX_WORD_COUNT = 10000;

// Re-export shared utilities for backward compatibility
export {
  removeHtmlTags,
  normalizeWhitespace,
  normalizeBullets,
  normalizeHeadings,
  extractMetadata,
};

// VALIDATION - Resume-specific validation logic

export const validateResume = (
  text: string,
  metadata: ResumeMetadata,
): {
  isValid: boolean;
  error?: { code: string; message: string; details?: object };
} => {
  // Use shared generic validation first
  const genericValidation = validateText(
    text,
    MIN_CHAR_COUNT,
    MAX_WORD_COUNT * 5,
    "Resume",
  );
  if (!genericValidation.isValid) {
    return genericValidation;
  }

  // Resume-specific check: max word count
  if (metadata.wordCount > MAX_WORD_COUNT) {
    return {
      isValid: false,
      error: {
        code: "CORRUPTED",
        message: `Resume appears to be corrupted or contains excessive content. Found ${metadata.wordCount} words, maximum allowed: ${MAX_WORD_COUNT}.`,
        details: {
          wordCount: metadata.wordCount,
          maxWordCount: MAX_WORD_COUNT,
        },
      },
    };
  }

  return { isValid: true };
};

// RESUME TO TEXT CONVERSION (moved from ai.utils.ts)

export const convertResumeToText = (resume: Resume): Promise<string> => {
  return new Promise((resolve) => {
    const formatContactInfo = (contactInfo?: ContactInfo) => {
      if (!contactInfo) return "";
      const parts = [
        `Name: ${contactInfo.firstName} ${contactInfo.lastName}`,
        contactInfo.headline ? `Headline: ${contactInfo.headline}` : "",
        contactInfo.email ? `Email: ${contactInfo.email}` : "",
        contactInfo.phone ? `Phone: ${contactInfo.phone}` : "",
        contactInfo.address ? `Address: ${contactInfo.address}` : "",
      ].filter(Boolean);
      return parts.join("\n");
    };

    const formatDate = (date: Date) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };

    const formatWorkExperiences = (workExperiences?: WorkExperience[]) => {
      if (!workExperiences || workExperiences.length === 0) return "";
      return workExperiences
        .map((experience) => {
          const desc = removeHtmlTags(experience.description);
          const startDate = formatDate(experience.startDate);
          const endDate = experience.currentJob
            ? "Present"
            : formatDate(experience.endDate);
          const parts = [
            `Company: ${experience.Company.label}`,
            `Job Title: ${experience.jobTitle.label}`,
            `Location: ${experience.location.label}`,
            `Dates: ${startDate} - ${endDate}`,
            desc ? `Description: ${desc}` : "",
          ].filter(Boolean);
          return parts.join("\n");
        })
        .join("\n\n");
    };

    const formatEducation = (educations?: Education[]) => {
      if (!educations || educations.length === 0) return "";
      return educations
        .map((education) => {
          const desc = removeHtmlTags(education.description);
          const startDate = formatDate(education.startDate);
          const endDate = education.endDate
            ? formatDate(education.endDate)
            : "Present";
          const parts = [
            `Institution: ${education.institution}`,
            `Degree: ${education.degree}`,
            `Field of Study: ${education.fieldOfStudy}`,
            `Location: ${education.location.label}`,
            `Dates: ${startDate} - ${endDate}`,
            desc ? `Description: ${desc}` : "",
          ].filter(Boolean);
          return parts.join("\n");
        })
        .join("\n\n");
    };

    const formatResumeSections = (sections?: ResumeSection[]) => {
      if (!sections || sections.length === 0) return "";
      return sections
        .map((section) => {
          switch (section.sectionType) {
            case SectionType.SUMMARY: {
              const content = removeHtmlTags(section.summary?.content);
              return content ? `## SUMMARY\n${content}` : "";
            }
            case SectionType.EXPERIENCE: {
              const content = formatWorkExperiences(section.workExperiences);
              return content ? `## EXPERIENCE\n${content}` : "";
            }
            case SectionType.EDUCATION: {
              const content = formatEducation(section.educations);
              return content ? `## EDUCATION\n${content}` : "";
            }
            default:
              return "";
          }
        })
        .filter(Boolean)
        .join("\n\n");
    };

    const contactInfo = formatContactInfo(resume.ContactInfo);
    const sections = formatResumeSections(resume.ResumeSections);

    const parts = [
      `# ${resume.title}`,
      contactInfo ? `## CONTACT\n${contactInfo}` : "",
      sections,
    ].filter(Boolean);

    return resolve(parts.join("\n\n"));
  });
};

// MAIN ORCHESTRATOR

export const preprocessResume = async (
  resume: Resume,
): Promise<PreprocessingResult> => {
  try {
    // Convert resume object to raw text
    const rawText = await convertResumeToText(resume);
    // Quick validation - fail fast if obviously invalid
    if (!rawText || rawText.trim().length < MIN_CHAR_COUNT) {
      const charCount = rawText?.trim().length || 0;
      return {
        success: false,
        error: {
          code: charCount === 0 ? "NO_CONTENT" : "TOO_SHORT",
          message:
            charCount === 0
              ? "Resume appears to be empty"
              : `Resume is too short (${charCount} characters, minimum ${MIN_CHAR_COUNT} required)`,
          details: { characterCount: charCount },
        },
      };
    }

    // Apply normalization pipeline
    let normalizedText = rawText;
    normalizedText = normalizeWhitespace(normalizedText);
    normalizedText = normalizeBullets(normalizedText);
    normalizedText = normalizeHeadings(normalizedText);

    // Extract metadata
    const metadata = extractMetadata(normalizedText);

    // Full validation
    const validationResult = validateResume(normalizedText, metadata);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error!,
      };
    }

    return {
      success: true,
      data: {
        normalizedText,
        metadata,
        isValid: true,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: {
        code: "PREPROCESSING_ERROR",
        message: `Failed to preprocess resume: ${message}`,
      },
    };
  }
};
