import React from "react";
import { Resume, SectionType } from "@/models/profile.model";
import { htmlToPdfNodes } from "./html-to-pdf";
import { ResumeLayout, RESUME_LAYOUT_LABELS } from "./types";
import { simpleHtmlStyles } from "./styles/simple.styles";
import { professionalHtmlStyles } from "./styles/professional.styles";

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
  layout: ResumeLayout = "simple",
): Promise<{ blob: Blob; filename: string }> {
  const htmlStyles = layout === "professional" ? professionalHtmlStyles : simpleHtmlStyles;

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
      ? htmlToPdfNodes(summarySection.summary.content, htmlStyles)
      : [],
    experiences:
      experienceSection?.workExperiences?.map((exp) =>
        exp.description ? htmlToPdfNodes(exp.description, htmlStyles) : [],
      ) ?? [],
    educations:
      educationSection?.educations?.map((edu) =>
        edu.description ? htmlToPdfNodes(edu.description, htmlStyles) : [],
      ) ?? [],
  };

  const { pdf } = await import("@react-pdf/renderer");

  let document: React.ReactElement;
  if (layout === "professional") {
    const { ProfessionalResumeDocument } = await import("./ProfessionalTemplate");
    document = <ProfessionalResumeDocument resume={resume} htmlNodes={htmlNodes} />;
  } else {
    const { SimpleResumeDocument } = await import("./SimpleTemplate");
    document = <SimpleResumeDocument resume={resume} htmlNodes={htmlNodes} />;
  }

  const blob = await pdf(document).toBlob();
  const filename = `${sanitizeFilename(resume.title)} - ${RESUME_LAYOUT_LABELS[layout]}.pdf`;
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
