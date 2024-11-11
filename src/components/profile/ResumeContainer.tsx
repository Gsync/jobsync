"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef } from "react";
import SummarySectionCard from "./SummarySectionCard";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";
import AiResumeReviewSection from "./AiResumeReviewSection";
import { Paperclip } from "lucide-react";

function ResumeContainer({ resume }: { resume: Resume }) {
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const { title, ContactInfo, ResumeSections } = resume ?? {};
  const summarySection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.SUMMARY
  );
  const experienceSection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.EXPERIENCE
  );
  const educationSection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.EDUCATION
  );
  const openContactInfoDialog = () => {
    resumeSectionRef.current?.openContactInfoDialog(ContactInfo!);
  };
  const openSummaryDialogForEdit = () => {
    resumeSectionRef.current?.openSummaryDialog(summarySection!);
  };
  const openExperienceDialogForEdit = (experienceId: string) => {
    const section: ResumeSection = {
      ...experienceSection!,
      workExperiences: experienceSection?.workExperiences?.filter(
        (exp) => exp.id === experienceId
      ),
    };
    resumeSectionRef.current?.openExperienceDialog(section);
  };
  const openEducationDialogForEdit = (educationId: string) => {
    const section: ResumeSection = {
      ...educationSection!,
      educations: educationSection?.educations?.filter(
        (edu) => edu.id === educationId
      ),
    };
    resumeSectionRef.current?.openEducationDialog(section);
  };

  function DownloadFileButton(filePath: any, fileName: string) {
    const handleDownload = async () => {
      const response = await fetch(
        `/api/profile/resume?filePath=${encodeURIComponent(filePath)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filePath.split("/").pop(); // Get the file name
        link.target = "_blank";
        link.click();
        window.URL.revokeObjectURL(url); // Clean up
      } else {
        console.error("Failed to download file");
      }
    };

    return (
      <button
        className="flex items-center"
        onClick={handleDownload}
        title="Download resume"
      >
        <div>{fileName}</div>
        <Paperclip className="h-3.5 w-3.5 ml-1" />
      </button>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Resume</CardTitle>
          <CardDescription>
            {resume.FileId && resume.File?.filePath
              ? DownloadFileButton(resume.File?.filePath, title)
              : title}
          </CardDescription>
          <div className="flex items-center">
            <AddResumeSection resume={resume} ref={resumeSectionRef} />
            <AiResumeReviewSection resume={resume} />
          </div>
        </CardHeader>
      </Card>
      {ContactInfo && (
        <ContactInfoCard
          contactInfo={ContactInfo}
          openDialog={openContactInfoDialog}
        />
      )}
      {summarySection && (
        <SummarySectionCard
          summarySection={summarySection}
          openDialogForEdit={openSummaryDialogForEdit}
        />
      )}
      {experienceSection && (
        <ExperienceCard
          experienceSection={experienceSection}
          openDialogForEdit={openExperienceDialogForEdit}
        />
      )}
      {educationSection && (
        <EducationCard
          educationSection={educationSection}
          openDialogForEdit={openEducationDialogForEdit}
        />
      )}
    </>
  );
}

export default ResumeContainer;
