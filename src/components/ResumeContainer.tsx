"use client";
import { Resume } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef } from "react";

function ResumeContainer({ resume }: { resume: Resume }) {
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const openContactInfoDialog = () => {
    resumeSectionRef.current?.openDialog();
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
    </>
  );
}

export default ResumeContainer;
