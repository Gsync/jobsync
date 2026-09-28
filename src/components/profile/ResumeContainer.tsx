"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toastSuccess, toastError, toastActionResult } from "@/lib/toast";
import SummarySectionCard from "./SummarySectionCard";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";
import CertificationCard from "./CertificationCard";
import SkillsSectionCard from "./SkillsSectionCard";
import { ReviewDetails } from "./ReviewDetails";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import type { ResumeReviewData } from "@/models/ai.schemas";
import { ExportPdfDialog } from "./ExportPdfDialog";
import { Sparkles } from "lucide-react";
import {
  deleteCertification,
  deleteSkillsSection,
  setDefaultResume,
} from "@/actions/profile.actions";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { ResumeHeader } from "./resume-container/ResumeHeader";
import { ImportReviewBanner } from "./resume-container/ImportReviewBanner";
import { StructureWithAiCard } from "./resume-container/StructureWithAiCard";
import {
  AttachPdfDialog,
  ClearChatBeforeReviewDialog,
  DiscardImportDialog,
} from "./resume-container/ResumeDialogs";
import { useResumeImport } from "./resume-container/useResumeImport";
import { useResumePdfExport } from "./resume-container/useResumePdfExport";

function ResumeContainer({
  resume,
  defaultResumeId,
}: {
  resume: Resume;
  defaultResumeId?: string | null;
}) {
  const router = useRouter();
  const goBack = () => router.back();
  const isDefault = !!resume?.id && resume.id === defaultResumeId;
  const [setDefaultConfirmOpen, setSetDefaultConfirmOpen] = useState(false);
  const {
    open: openChat,
    sendMessage,
    clear: clearChat,
    approvalPending,
  } = useAgentChat();
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const parsedReviewData = useMemo(() => {
    if (!resume.reviewData) return null;
    try {
      return JSON.parse(resume.reviewData) as ResumeReviewData;
    } catch {
      return null;
    }
  }, [resume.reviewData]);
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDiscardImportConfirm, setShowDiscardImportConfirm] =
    useState(false);

  const {
    pendingCards,
    importTruncated,
    unrecognizedSections,
    importMode,
    aiModel,
    aiReady,
    ollamaConnected,
    connectionError,
    isStructuring,
    handleAcceptCard,
    handleDiscardCard,
    handleDiscardImport,
    handleStructureWithAI,
  } = useResumeImport(resume);

  const {
    showAttachConfirm,
    setShowAttachConfirm,
    handleExportPdf,
    handleAttachChoice,
    cancelAttach,
  } = useResumePdfExport(resume);

  const { title, ContactInfo, ResumeSections } = resume ?? {};
  const summarySection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.SUMMARY,
  );
  const experienceSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.EXPERIENCE,
  );
  const educationSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.EDUCATION,
  );
  const certificationSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.CERTIFICATION,
  );
  const skillsSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.SKILLS,
  );

  // Panel first so a failed clear can never leave the button looking dead,
  // and the review is sent either way — a conversation that would not clear
  // is no reason to withhold it.
  const startReview = async () => {
    openChat();
    try {
      await clearChat();
    } catch {
      // Reported by the action itself; the review still goes out.
    }
    void sendMessage({ parts: [{ type: "text", text: `Review ${title}` }] });
  };

  const onReviewClick = () => {
    if (approvalPending) {
      setShowClearChatConfirm(true);
      return;
    }
    void startReview();
  };

  const openContactInfoDialog = () =>
    resumeSectionRef.current?.openContactInfoDialog(ContactInfo!);
  const openSummaryDialogForEdit = () =>
    resumeSectionRef.current?.openSummaryDialog(summarySection!);
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
  const openSkillsDialogForEdit = () => {
    resumeSectionRef.current?.openSkillsDialog(skillsSection!);
  };
  const handleDeleteSkillsSection = async () => {
    if (!skillsSection?.id) return;
    const result = await deleteSkillsSection(skillsSection.id);
    toastActionResult(result, {
      success: "Skills section has been deleted successfully",
      onSuccess: () => router.refresh(),
    });
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
  const handleDeleteCertification = async (certificationId: string) => {
    const result = await deleteCertification(certificationId);
    toastActionResult(result, {
      success: "Certification has been deleted successfully",
      onSuccess: () => router.refresh(),
    });
  };

  const isEmptyResume =
    !ContactInfo && (!ResumeSections || ResumeSections.length === 0);
  const showStructureWithAI =
    isEmptyResume && !!resume.File?.filePath && aiReady && !importMode;

  const handleSetDefault = async () => {
    if (!resume?.id) return;
    const { success, message } = await setDefaultResume(resume.id);
    if (success) {
      toastSuccess("This resume is now your default.");
      router.refresh();
    } else {
      toastError(message);
    }
  };

  return (
    <>
      <ResumeHeader
        resume={resume}
        title={title}
        isDefault={isDefault}
        resumeSectionRef={resumeSectionRef}
        onBack={goBack}
        onReview={onReviewClick}
        onExport={() => setShowExportDialog(true)}
        onSetDefault={() => setSetDefaultConfirmOpen(true)}
      />

      <DeleteAlertDialog
        pageTitle="resume"
        open={setDefaultConfirmOpen}
        onOpenChange={setSetDefaultConfirmOpen}
        onDelete={handleSetDefault}
        alertTitle="Change default resume?"
        alertDescription="This will make this resume your default, replacing any current default."
        actionLabel="Set as default"
        actionVariant="default"
      />

      {parsedReviewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              AI Review
            </CardTitle>
            <ReviewDetails reviewData={parsedReviewData} />
          </CardHeader>
        </Card>
      )}

      {/* IMPORT REVIEW BANNER */}
      {importMode && (pendingCards.length > 0 || isStructuring) && (
        <ImportReviewBanner
          pendingCards={pendingCards}
          isStructuring={isStructuring}
          importTruncated={importTruncated}
          unrecognizedSections={unrecognizedSections}
          onAccept={handleAcceptCard}
          onDiscard={handleDiscardCard}
          onDiscardImport={() => setShowDiscardImportConfirm(true)}
        />
      )}

      {/* STRUCTURE WITH AI BUTTON (empty imported resume, AI available) */}
      {showStructureWithAI && (
        <StructureWithAiCard
          aiModel={aiModel}
          ollamaConnected={ollamaConnected}
          connectionError={connectionError}
          isStructuring={isStructuring}
          onStructure={handleStructureWithAI}
        />
      )}

      {/* SAVED SECTIONS */}
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
      {skillsSection && (
        <SkillsSectionCard
          skillsSection={skillsSection}
          openDialogForEdit={openSkillsDialogForEdit}
          onDelete={handleDeleteSkillsSection}
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
          onDelete={handleDeleteCertification}
        />
      )}

      {/* PDF EXPORT PREVIEW + SETTINGS */}
      <ExportPdfDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        resume={resume}
        onExport={handleExportPdf}
      />

      <AttachPdfDialog
        open={showAttachConfirm}
        onOpenChange={setShowAttachConfirm}
        onChoice={handleAttachChoice}
        onCancel={cancelAttach}
      />

      <ClearChatBeforeReviewDialog
        open={showClearChatConfirm}
        onOpenChange={setShowClearChatConfirm}
        onConfirm={() => void startReview()}
      />

      <DiscardImportDialog
        open={showDiscardImportConfirm}
        onOpenChange={setShowDiscardImportConfirm}
        onConfirm={handleDiscardImport}
      />
    </>
  );
}

export default ResumeContainer;
