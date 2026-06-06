"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef, useState } from "react";
import { toast } from "../ui/use-toast";
import SummarySectionCard from "./SummarySectionCard";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";
import CertificationCard from "./CertificationCard";
import AiResumeReviewSection from "./AiResumeReviewSection";
import { DownloadFileButton } from "./DownloadFileButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { MoreHorizontal, FileDown } from "lucide-react";

function ResumeContainer({ resume }: { resume: Resume }) {
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const [isExporting, setIsExporting] = useState(false);
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { downloadResumePdf } = await import("./resume-pdf");
      await downloadResumePdf(resume);
    } catch {
      toast({
        title: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  const { title, ContactInfo, ResumeSections } = resume ?? {};
  const summarySection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.SUMMARY,
  );
  const experienceSection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.EXPERIENCE,
  );
  const educationSection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.EDUCATION,
  );
  const certificationSection = ResumeSections?.find(
    (section) => section.sectionType === SectionType.CERTIFICATION,
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
        (exp) => exp.id === experienceId,
      ),
    };
    resumeSectionRef.current?.openExperienceDialog(section);
  };
  const openEducationDialogForEdit = (educationId: string) => {
    const section: ResumeSection = {
      ...educationSection!,
      educations: educationSection?.educations?.filter(
        (edu) => edu.id === educationId,
      ),
    };
    resumeSectionRef.current?.openEducationDialog(section);
  };
  const openCertificationDialogForEdit = (certificationId: string) => {
    const section: ResumeSection = {
      ...certificationSection!,
      licenseOrCertifications:
        certificationSection?.licenseOrCertifications?.filter(
          (cert) => cert.id === certificationId,
        ),
    };
    resumeSectionRef.current?.openCertificationDialog(section);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-center lg:grid lg:grid-cols-3 lg:items-center">
          <CardTitle>Resume</CardTitle>
          <CardDescription className="mt-0 lg:flex lg:justify-center">
            {resume.FileId && resume.File?.filePath
              ? DownloadFileButton(
                  resume.File?.filePath,
                  title,
                  resume.File?.fileName,
                )
              : title}
          </CardDescription>
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <AddResumeSection resume={resume} ref={resumeSectionRef} />
            <AiResumeReviewSection resume={resume} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {isExporting ? "Generating…" : "Export to PDF"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      {certificationSection && (
        <CertificationCard
          certificationSection={certificationSection}
          openDialogForEdit={openCertificationDialogForEdit}
        />
      )}
    </>
  );
}

export default ResumeContainer;
