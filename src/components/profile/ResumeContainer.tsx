"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef } from "react";
import SummarySectionCard from "./SummarySectionCard";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";

function ResumeContainer({ resume }: { resume: Resume }) {
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const summarySection = resume?.ResumeSections?.find(
    (section) => section.sectionType === SectionType.SUMMARY
  );
  const experienceSection = resume?.ResumeSections?.find(
    (section) => section.sectionType === SectionType.EXPERIENCE
  );
  const educationSection = resume?.ResumeSections?.find(
    (section) => section.sectionType === SectionType.EDUCATION
  );
  const openContactInfoDialog = () => {
    resumeSectionRef.current?.openContactInfoDialog(resume?.ContactInfo!);
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
  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Resume</CardTitle>
          <CardDescription>{resume?.title}</CardDescription>
          <div className="flex items-center">
            <AddResumeSection resume={resume} ref={resumeSectionRef} />
          </div>
        </CardHeader>
      </Card>
      {resume?.ContactInfo ? (
        <ContactInfoCard
          contactInfo={resume.ContactInfo}
          openDialog={openContactInfoDialog}
        />
      ) : null}
      {summarySection ? (
        <SummarySectionCard
          summarySection={summarySection}
          openDialogForEdit={openSummaryDialogForEdit}
        />
      ) : null}
      {experienceSection ? (
        <ExperienceCard
          experienceSection={experienceSection}
          openDialogForEdit={openExperienceDialogForEdit}
        />
      ) : null}
      {educationSection ? (
        <EducationCard
          educationSection={educationSection}
          openDialogForEdit={openEducationDialogForEdit}
        />
      ) : null}
    </>
  );
}

export default ResumeContainer;
