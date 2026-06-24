"use client";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import AddResumeSection, { AddResumeSectionRef } from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { ResumeLayout } from "./resume-pdf";
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
import { Badge } from "../ui/badge";
import {
  MoreHorizontal,
  FileDown,
  Sparkles,
  Check,
  X,
  Loader,
  AlertTriangle,
} from "lucide-react";
import { deleteResumeById } from "@/actions/profile.actions";
import {
  resolveImportCard,
  ImportCardPayload,
} from "@/actions/resumeImport.actions";
import { ResumeImportData } from "@/models/resumeImport.schema";
import { AiModel, defaultModel } from "@/models/ai.model";
import { getUserSettings } from "@/actions/userSettings.actions";
import { streamResumeImport } from "@/utils/resumeImportStream.utils";
import type { DeepPartial } from "ai";

type PendingCard = {
  id: string;
  card: ImportCardPayload;
};

// Keywords that map to supported section types — filter these out of unrecognizedSections
const SUPPORTED_KEYWORDS = [
  "contact",
  "summary",
  "experience",
  "education",
  "certification",
  "certifications",
];

function filterUnrecognizedSections(sections: string[]): string[] {
  return sections.filter((section) => {
    const lower = section.toLowerCase();
    return !SUPPORTED_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

// Accepts partial data so cards can render progressively as the import stream
// arrives. Entries are only shown once their key identifying field is present.
function buildPendingCards(
  data: DeepPartial<ResumeImportData>,
): PendingCard[] {
  const cards: PendingCard[] = [];

  if (!data) return cards;

  if (
    data.contactInfo &&
    Object.keys(data.contactInfo).some(
      (k) => k !== "confidence" && !!(data.contactInfo as any)[k],
    )
  ) {
    cards.push({
      id: "contactInfo",
      card: { type: "contactInfo", data: data.contactInfo as any },
    });
  }

  if (data.summary?.trim()) {
    cards.push({
      id: "summary",
      card: { type: "summary", data: data.summary },
    });
  }

  (data.experience ?? []).forEach((exp, i) => {
    if (!exp || (!exp.company && !exp.jobTitle)) return;
    cards.push({
      id: `experience-${i}`,
      card: { type: "experience", data: exp as any },
    });
  });

  (data.education ?? []).forEach((edu, i) => {
    if (!edu || !edu.institution) return;
    cards.push({
      id: `education-${i}`,
      card: { type: "education", data: edu as any },
    });
  });

  (data.certifications ?? []).forEach((cert, i) => {
    if (!cert || !cert.title) return;
    cards.push({
      id: `certification-${i}`,
      card: { type: "certification", data: cert as any },
    });
  });

  return cards;
}

function cardSectionLabel(type: ImportCardPayload["type"]): string {
  const map: Record<string, string> = {
    contactInfo: "Contact Info",
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    certification: "Certification",
  };
  return map[type] ?? type;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-foreground break-words min-w-0">{value}</span>
    </div>
  );
}

function PendingCardDetail({ card }: { card: ImportCardPayload }) {
  if (card.type === "contactInfo") {
    const d = card.data;
    const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
    return (
      <div className="space-y-1 mt-1">
        {name && <DetailRow label="Name" value={name} />}
        <DetailRow label="Headline" value={d.headline} />
        <DetailRow label="Email" value={d.email} />
        <DetailRow label="Phone" value={d.phone} />
        <DetailRow label="Address" value={d.address} />
      </div>
    );
  }

  if (card.type === "summary") {
    return (
      <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">
        {card.data}
      </p>
    );
  }

  if (card.type === "experience") {
    const d = card.data;
    const dates = [d.startDate, d.endDate ? d.endDate : "Present"]
      .filter(Boolean)
      .join(" – ");
    return (
      <div className="space-y-1 mt-1">
        <DetailRow label="Title" value={d.jobTitle} />
        <DetailRow label="Company" value={d.company} />
        <DetailRow label="Location" value={d.location} />
        {dates && <DetailRow label="Dates" value={dates} />}
        {d.description && (
          <p className="text-xs text-foreground mt-1 whitespace-pre-wrap pl-[5.5rem]">
            {d.description}
          </p>
        )}
      </div>
    );
  }

  if (card.type === "education") {
    const d = card.data;
    const dates = [d.startDate, d.endDate].filter(Boolean).join(" – ");
    return (
      <div className="space-y-1 mt-1">
        <DetailRow label="Institution" value={d.institution} />
        <DetailRow label="Degree" value={d.degree} />
        <DetailRow label="Field" value={d.fieldOfStudy} />
        <DetailRow label="Location" value={d.location} />
        {dates && <DetailRow label="Dates" value={dates} />}
        {d.description && (
          <p className="text-xs text-foreground mt-1 whitespace-pre-wrap pl-[5.5rem]">
            {d.description}
          </p>
        )}
      </div>
    );
  }

  if (card.type === "certification") {
    const d = card.data;
    return (
      <div className="space-y-1 mt-1">
        <DetailRow label="Title" value={d.title} />
        <DetailRow label="Issuer" value={d.organization} />
        <DetailRow label="Issued" value={d.issueDate} />
        <DetailRow label="Expires" value={d.expirationDate} />
        <DetailRow label="URL" value={d.credentialUrl} />
      </div>
    );
  }

  return null;
}

// Individual pending card row
function PendingCardRow({
  pending,
  onAccept,
  onDiscard,
  locked,
}: {
  pending: PendingCard;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  locked?: boolean;
}) {
  const [isSaving, startSaving] = useTransition();

  return (
    <div className="border border-dashed rounded-md px-4 py-3 bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <Badge variant="outline" className="text-xs shrink-0">
          {cardSectionLabel(pending.card.type)}
        </Badge>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={isSaving || locked}
            onClick={() =>
              startSaving(async () => {
                await onAccept(pending.id);
              })
            }
          >
            {isSaving ? (
              <Loader className="h-3 w-3 spinner" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            <span className="ml-1">Accept</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={isSaving || locked}
            onClick={() => onDiscard(pending.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <PendingCardDetail card={pending.card} />
    </div>
  );
}

function ResumeContainer({ resume }: { resume: Resume }) {
  const router = useRouter();
  const resumeSectionRef = useRef<AddResumeSectionRef>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [showAttachConfirm, setShowAttachConfirm] = useState(false);
  const [showDiscardImportConfirm, setShowDiscardImportConfirm] =
    useState(false);

  // Import review mode state
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [importTruncated, setImportTruncated] = useState(false);
  const [unrecognizedSections, setUnrecognizedSections] = useState<string[]>(
    [],
  );
  const [importMode, setImportMode] = useState(false);

  // AI availability for "Structure with AI" button
  const [aiModel, setAiModel] = useState<AiModel>(defaultModel);
  const [aiReady, setAiReady] = useState(false);
  // Plain boolean (not useTransition): streaming fires rapid state updates that
  // must not run as interruptible transition renders.
  const [isStructuring, setIsStructuring] = useState(false);

  // Runs the import stream, rendering cards progressively as they arrive.
  const runImport = useCallback(
    async (model: AiModel) => {
      const resumeId = resume.id;
      if (!resumeId || isStructuring) return;
      setIsStructuring(true);
      setImportMode(true);
      try {
        const { data, truncated } = await streamResumeImport({
          resumeId,
          selectedModel: model,
          onPartial: (partial) => {
            const cards = buildPendingCards(partial);
            if (cards.length > 0) setPendingCards(cards);
          },
        });

        const cards = buildPendingCards(data);
        if (cards.length === 0) {
          setImportMode(false);
          toast({
            title: "No sections found",
            description:
              "No structured data could be extracted from the document.",
          });
          return;
        }
        setPendingCards(cards);
        setImportTruncated(truncated);
        setUnrecognizedSections(
          filterUnrecognizedSections(data.unrecognizedSections ?? []),
        );
      } catch (error) {
        setImportMode(false);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to contact AI service.",
        });
      } finally {
        setIsStructuring(false);
      }
    },
    [resume.id, isStructuring],
  );

  // Auto-start the import stream when arriving from the create dialog
  useEffect(() => {
    if (!resume.id) return;
    const key = `import-pending:${resume.id}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return;
    sessionStorage.removeItem(key);
    try {
      const { selectedModel } = JSON.parse(stored) as {
        selectedModel: AiModel;
      };
      runImport(selectedModel);
    } catch {
      // Malformed sessionStorage entry — ignore
    }
  }, [resume.id, runImport]);

  // Tab-close guard while pending cards exist
  useEffect(() => {
    if (pendingCards.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCards.length]);

  // Load AI settings for "Structure with AI" button
  useEffect(() => {
    if (resume.File?.filePath && !importMode) {
      getUserSettings().then((result) => {
        if (result.success && result.data?.settings?.ai) {
          const ai = result.data.settings.ai;
          const model: AiModel = {
            provider: ai.provider || defaultModel.provider,
            model: ai.model,
          };
          setAiModel(model);
          setAiReady(true);
        }
      });
    }
  }, [resume.File?.filePath, importMode]);

  const handleAcceptCard = useCallback(
    async (cardId: string) => {
      const pending = pendingCards.find((c) => c.id === cardId);
      if (!pending || !resume.id) return;
      const result = await resolveImportCard(resume.id, pending.card);
      if (result.success) {
        setPendingCards((prev) => prev.filter((c) => c.id !== cardId));
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    },
    [pendingCards, resume.id, router],
  );

  const handleDiscardCard = useCallback((cardId: string) => {
    setPendingCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const handleDiscardImport = async () => {
    if (!resume.id) return;
    const result = await deleteResumeById(resume.id);
    if (result?.success) {
      router.push("/dashboard/profile");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result?.message,
      });
    }
  };

  const handleStructureWithAI = () => runImport(aiModel);

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

  const handleExportPdf = async (layout: ResumeLayout) => {
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
      const { blob, filename } = await generateResumePdfBlob(resume, layout);

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

  const isEmptyResume =
    !ContactInfo && (!ResumeSections || ResumeSections.length === 0);
  const showStructureWithAI =
    isEmptyResume && !!resume.File?.filePath && aiReady && !importMode;

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
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    className="cursor-pointer"
                    disabled={isExporting}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {isExporting ? "Generating…" : "Export to PDF"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleExportPdf("simple")}
                      disabled={isExporting}
                    >
                      Simple
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleExportPdf("professional")}
                      disabled={isExporting}
                    >
                      Professional
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* IMPORT REVIEW BANNER */}
      {importMode && (pendingCards.length > 0 || isStructuring) && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  {isStructuring ? (
                    <>
                      <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                      Structuring your document… you can review and accept items
                      once it finishes.
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      We pre-filled this from your document. Review each item and
                      accept the ones you want.
                      {importTruncated &&
                        " Only the first 5 pages were imported."}
                    </>
                  )}
                </p>
                {unrecognizedSections.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Some sections couldn&apos;t be imported (
                    {unrecognizedSections.join(", ")}) — the resume model
                    doesn&apos;t support these yet.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDiscardImportConfirm(true)}
              >
                Discard import
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {pendingCards.map((pending) => (
                <PendingCardRow
                  key={pending.id}
                  pending={pending}
                  onAccept={handleAcceptCard}
                  onDiscard={handleDiscardCard}
                  locked={isStructuring}
                />
              ))}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* STRUCTURE WITH AI BUTTON (empty imported resume, AI available) */}
      {showStructureWithAI && (
        <Card className="border-dashed">
          <CardHeader className="flex-row items-center justify-between">
            <p className="text-sm text-muted-foreground">
              A file is attached. Structure it into sections using AI.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={isStructuring}
              onClick={handleStructureWithAI}
            >
              {isStructuring ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isStructuring ? "Structuring…" : "Structure with AI"}
            </Button>
          </CardHeader>
        </Card>
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

      {/* PDF ATTACHMENT CONFIRM */}
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

      {/* DISCARD IMPORT CONFIRM */}
      <AlertDialog
        open={showDiscardImportConfirm}
        onOpenChange={setShowDiscardImportConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this resume and its attached file. Unsaved
              suggestions will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDiscardImport}
            >
              Discard import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ResumeContainer;
