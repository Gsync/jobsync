"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { MoreHorizontal, FileDown } from "lucide-react";

function ResumeContainer({ resume }: { resume: Resume }) {
  const router = useRouter();
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [showAttachConfirm, setShowAttachConfirm] = useState(false);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadPdfAsAttachment = async (
    blob: Blob,
    filename: string,
    replaceExisting: boolean,
  ) => {
    const formData = new FormData();
    formData.append(
      "file",
      new File([blob], filename, { type: "application/pdf" }),
    );
    formData.append("title", resume.title);
    formData.append("id", resume.id!);
    if (replaceExisting && resume.FileId) {
      formData.append("fileId", resume.FileId);
    }
    const res = await fetch("/api/profile/resume", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    router.refresh();
  };

  const handleExportPdf = async () => {
    const hasName =
      resume.ContactInfo?.firstName?.trim() ||
      resume.ContactInfo?.lastName?.trim();
    const hasSections = resume.ResumeSections?.some(
      (s) =>
        s.summary?.content ||
        s.workExperiences?.length ||
        s.educations?.length ||
        s.licenseOrCertifications?.length,
    );
    if (!hasName && !hasSections) {
      toast({
        title: "Nothing to export",
        description:
          "Add your contact info and at least one section (Summary, Experience, or Education) before exporting.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const { generateResumePdfBlob } = await import("./resume-pdf");
      const { blob, filename } = await generateResumePdfBlob(resume);

      if (!resume.FileId) {
        triggerDownload(blob, filename);
        await uploadPdfAsAttachment(blob, filename, false);
        toast({
          title: "PDF exported",
          description: "Saved to Downloads and attached to this resume.",
        });
      } else {
        setPendingPdf({ blob, filename });
        setShowAttachConfirm(true);
      }
    } catch {
      toast({
        title: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAttachChoice = async (choice: "replace" | "download-only") => {
    if (!pendingPdf) return;
    setShowAttachConfirm(false);
    setIsExporting(true);
    try {
      const { blob, filename } = pendingPdf;
      triggerDownload(blob, filename);
      if (choice === "replace") {
        await uploadPdfAsAttachment(blob, filename, true);
        toast({
          title: "PDF exported",
          description: "Saved to Downloads and attachment replaced.",
        });
      } else {
        toast({
          title: "PDF exported",
          description: "Saved to your Downloads folder.",
        });
      }
    } catch {
      toast({
        title: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setPendingPdf(null);
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
      <AlertDialog open={showAttachConfirm} onOpenChange={setShowAttachConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This resume already has a file attached. Would you like to replace
              it with the exported PDF?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowAttachConfirm(false);
                setPendingPdf(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleAttachChoice("download-only")}
            >
              Download only
            </Button>
            <AlertDialogAction onClick={() => handleAttachChoice("replace")}>
              Replace attachment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ResumeContainer;
