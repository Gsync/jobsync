"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef, useState, useTransition } from "react";
import SummarySectionCard from "./SummarySectionCard";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";
import AiSection from "../AiSection";
import { getResumeReviewByAi } from "@/actions/ai.actions";
import { toast } from "../ui/use-toast";

function ResumeContainer({ resume }: { resume: Resume }) {
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [aIContent, setAIContent] = useState("");
  const [isPending, startTransition] = useTransition();

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
  const getResumeReview = () => {
    setAiSectionOpen(true);
    startTransition(async () => {
      const { response, success, message } = await getResumeReviewByAi();
      if (success && response && response.kwargs.content) {
        setAIContent(response.kwargs.content);
      }
      if (!success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
        return;
      }
    });
  };
  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Resume</CardTitle>
          <CardDescription>{resume?.title}</CardDescription>
          <div className="flex items-center">
            <AddResumeSection resume={resume} ref={resumeSectionRef} />
            <AiSection
              aISectionOpen={aISectionOpen}
              setAiSectionOpen={setAiSectionOpen}
              getAiResponse={getResumeReview}
              aIContent={aIContent}
              isPending={isPending}
            />
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
