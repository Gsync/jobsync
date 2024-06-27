"use client";
import { Resume, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef } from "react";
import SummarySectionCard from "./SummarySectionCard";

function ResumeContainer({ resume }: { resume: Resume }) {
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const summarySection = resume.ResumeSections.find(
    (section) => section.sectionType === SectionType.SUMMARY
  );
  const openContactInfoDialog = () => {
    resumeSectionRef.current?.openContactInfoDialog(resume.ContactInfo!);
  };
  const openSummaryDialogForEdit = () => {
    resumeSectionRef.current?.openSummaryDialog(summarySection!);
  };
  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Resume</CardTitle>
          <CardDescription>{resume.title}</CardDescription>
          <div className="flex items-center">
            <AddResumeSection resume={resume} ref={resumeSectionRef} />
          </div>
        </CardHeader>
      </Card>
      {resume.ContactInfo ? (
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
    </>
  );
}

export default ResumeContainer;
