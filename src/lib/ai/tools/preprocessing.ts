/**
 * Resume Preprocessing Module
 * Normalizes text, detects sections, extracts metadata, and validates resume content
 */

import {
  ContactInfo,
  Education,
  Resume,
  ResumeSection,
  SectionType,
  WorkExperience,
} from "@/models/profile.model";

// TYPES

export interface ResumeMetadata {
  characterCount: number;
  wordCount: number;
  lineCount: number;
  hasContactInfo: boolean;
}

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

const MIN_WORD_COUNT = 50;
const MIN_CHAR_COUNT = 200;
const MAX_WORD_COUNT = 10000;
const MAX_CONSECUTIVE_SPECIAL_CHARS = 20;

// UTILITY FUNCTIONS

export const removeHtmlTags = (description: string | undefined): string => {
  if (!description) return "";

  return description
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(li|p|div|br)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
};

// NORMALIZATION FUNCTIONS

export const normalizeWhitespace = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const normalizeBullets = (text: string): string => {
  return text
    .replace(/[•●○◦▪▸►◆★✦✓✔→‣⁃]/g, "•")
    .replace(/^[-–—]\s/gm, "• ")
    .replace(/^\*\s/gm, "• ");
};

export const normalizeHeadings = (text: string): string => {
  return text
    .replace(/^([A-Z][A-Z\s&]+):?\s*$/gm, (_match, heading) => {
      const normalized = heading.trim().replace(/:$/, "");
      return `\n${normalized}\n`;
    })
    .replace(/\n{3,}/g, "\n\n");
};

// METADATA EXTRACTION

export const extractMetadata = (text: string): ResumeMetadata => {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines = text.split("\n");

  return {
    characterCount: text.length,
    wordCount: words.length,
    lineCount: lines.length,
    hasContactInfo: hasContactPatterns(text),
  };
};

const hasContactPatterns = (text: string): boolean => {
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return emailPattern.test(text) || phonePattern.test(text);
};

// VALIDATION

interface ValidationResult {
  isValid: boolean;
  error?: { code: string; message: string; details?: object };
}

export const validateResume = (
  text: string,
  metadata: ResumeMetadata,
): ValidationResult => {
  // Check for empty content
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: {
        code: "NO_CONTENT",
        message: "Resume appears to be empty or contains only whitespace",
      },
    };
  }

  // Check minimum length
  if (
    metadata.wordCount < MIN_WORD_COUNT ||
    metadata.characterCount < MIN_CHAR_COUNT
  ) {
    return {
      isValid: false,
      error: {
        code: "TOO_SHORT",
        message: `Resume is too short. Found ${metadata.wordCount} words and ${metadata.characterCount} characters. Minimum required: ${MIN_WORD_COUNT} words or ${MIN_CHAR_COUNT} characters.`,
        details: {
          wordCount: metadata.wordCount,
          characterCount: metadata.characterCount,
          minWordCount: MIN_WORD_COUNT,
          minCharCount: MIN_CHAR_COUNT,
        },
      },
    };
  }

  // Check for corruption - too long
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

  // Check for corruption - consecutive special characters
  const specialCharPattern = new RegExp(
    `[^a-zA-Z0-9\\s]{${MAX_CONSECUTIVE_SPECIAL_CHARS + 1},}`,
  );
  if (specialCharPattern.test(text)) {
    return {
      isValid: false,
      error: {
        code: "CORRUPTED",
        message:
          "Resume appears to be corrupted. Found excessive consecutive special characters.",
        details: {
          maxConsecutiveSpecialChars: MAX_CONSECUTIVE_SPECIAL_CHARS,
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

    const formatWorkExperiences = (workExperiences?: WorkExperience[]) => {
      if (!workExperiences || workExperiences.length === 0) return "";
      return workExperiences
        .map((experience) => {
          const desc = removeHtmlTags(experience.description);
          const parts = [
            `Company: ${experience.Company.label}`,
            `Job Title: ${experience.jobTitle.label}`,
            `Location: ${experience.location.label}`,
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
          const parts = [
            `Institution: ${education.institution}`,
            `Degree: ${education.degree}`,
            `Field of Study: ${education.fieldOfStudy}`,
            `Location: ${education.location.label}`,
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
            case SectionType.SUMMARY:
              return `Summary: ${removeHtmlTags(section.summary?.content)}`;
            case SectionType.EXPERIENCE:
              return formatWorkExperiences(section.workExperiences);
            case SectionType.EDUCATION:
              return formatEducation(section.educations);
            default:
              return "";
          }
        })
        .join("\n");
    };

    const inputMessage = `
Title: ${resume.title}
${formatContactInfo(resume.ContactInfo)}
${formatResumeSections(resume.ResumeSections)}
`;
    return resolve(inputMessage);
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
    console.log("RESUME: ", { normalizedText, metadata });
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
