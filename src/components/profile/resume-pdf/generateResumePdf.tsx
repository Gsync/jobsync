import React from "react";
import { Resume, SectionType } from "@/models/profile.model";
import { htmlToPdfNodes } from "./html-to-pdf";
import { ProfessionalResumeDocument } from "./ProfessionalTemplate";

export type ResumeHtmlNodes = {
  summary: React.ReactElement[];
  experiences: React.ReactElement[][];
  educations: React.ReactElement[][];
};

export function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return sanitized || "resume";
}

export async function generateResumePdfBlob(
  resume: Resume,
): Promise<{ blob: Blob; filename: string }> {
  // Parse HTML in the browser main thread before entering react-pdf's rendering context
  const summarySection = resume.ResumeSections?.find(
    (s) => s.sectionType === SectionType.SUMMARY,
  );
  const experienceSection = resume.ResumeSections?.find(
    (s) => s.sectionType === SectionType.EXPERIENCE,
  );
  const educationSection = resume.ResumeSections?.find(
    (s) => s.sectionType === SectionType.EDUCATION,
  );

  const htmlNodes: ResumeHtmlNodes = {
    summary: summarySection?.summary?.content
      ? htmlToPdfNodes(summarySection.summary.content)
      : [],
    experiences:
      experienceSection?.workExperiences?.map((exp) =>
        exp.description ? htmlToPdfNodes(exp.description) : [],
      ) ?? [],
    educations:
      educationSection?.educations?.map((edu) =>
        edu.description ? htmlToPdfNodes(edu.description) : [],
      ) ?? [],
  };

  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <ProfessionalResumeDocument resume={resume} htmlNodes={htmlNodes} />,
  ).toBlob();
  const filename = `${sanitizeFilename(resume.title)}.pdf`;
  return { blob, filename };
}

export async function downloadResumePdf(resume: Resume): Promise<void> {
  const { blob, filename } = await generateResumePdfBlob(resume);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
