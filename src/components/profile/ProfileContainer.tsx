"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import CreateResume from "./CreateResume";
import CreateCoverLetter from "./CreateCoverLetter";
import CopyResumeDialog from "./CopyResumeDialog";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import {
  getResumeList,
  getDefaultResumeId,
  getDefaultContactInfo,
} from "@/actions/profile.actions";
import { getCoverLetterList } from "@/actions/coverLetter.actions";
import {
  ContactInfo,
  CoverLetter,
  ProfileDocument,
  Resume,
} from "@/models/profile.model";
import { CoverLetterExportDialog } from "./CoverLetterExportDialog";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import DocumentTable from "./ResumeTable";
import { toastError } from "@/lib/toast";
import { ChevronDown, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { RecordsCount } from "../RecordsCount";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// Resumes page through infinite scroll; letters load up to 100 at once.
const fetchDocuments = (page: number) =>
  Promise.all([
    getResumeList(page, APP_CONSTANTS.RECORDS_PER_PAGE),
    getCoverLetterList(1, 100),
  ]);

// allSettled, not all: contactInfo stuck at undefined would spin the export
// preview forever, and a failed letterhead read must not also cost the
// default-resume pointer.
const fetchDefaults = () =>
  Promise.allSettled([getDefaultResumeId(), getDefaultContactInfo()]);

const ProfileContainer = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [coverLetterDialogOpen, setCoverLetterDialogOpen] = useState(false);

  const [resumeToEdit, setResumeToEdit] = useState<Resume | null>(null);
  const [coverLetterToEdit, setCoverLetterToEdit] =
    useState<CoverLetter | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [resumeToCopy, setResumeToCopy] = useState<ProfileDocument | null>(
    null,
  );
  const [totalResumes, setTotalResumes] = useState<number>(0);
  const [totalCoverLetters, setTotalCoverLetters] = useState<number>(0);
  const [defaultResumeId, setDefaultResumeId] = useState<string | null>(null);
  // undefined means "not loaded yet", which gates the export preview.
  const [contactInfo, setContactInfo] = useState<ContactInfo | null | undefined>(
    undefined,
  );
  const [exportLetter, setExportLetter] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [page, setPage] = useState<number>(1);
  // True from the start: the mount load below sets no state before its reply.
  const [loading, setLoading] = useState(true);
  const applyResumes = useCallback(
    (page: number, result: Awaited<ReturnType<typeof getResumeList>>) => {
      const { data, total, success, message } = result;
      if (success && data) {
        setResumes((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalResumes(total);
        setPage(page);
      } else {
        toastError(message);
      }
    },
    [],
  );

  const applyCoverLetters = useCallback(
    (result: Awaited<ReturnType<typeof getCoverLetterList>>) => {
      const { data, total, success, message } = result;
      if (success && data) {
        setCoverLetters(data);
        setTotalCoverLetters(total);
      } else {
        toastError(message);
      }
    },
    [],
  );

  const applyDefaults = useCallback(
    ([id, contact]: Awaited<ReturnType<typeof fetchDefaults>>) => {
      if (id.status === "fulfilled") setDefaultResumeId(id.value);
      setContactInfo(contact.status === "fulfilled" ? contact.value : null);
    },
    [],
  );

  const loadDefaultResumeId = useCallback(async () => {
    applyDefaults(await fetchDefaults());
  }, [applyDefaults]);

  const applyDocuments = useCallback(
    (
      page: number,
      [resumes, letters]: Awaited<ReturnType<typeof fetchDocuments>>,
    ) => {
      applyResumes(page, resumes);
      applyCoverLetters(letters);
      setLoading(false);
    },
    [applyResumes, applyCoverLetters],
  );

  const loadDocuments = useCallback(
    async (page: number) => {
      setLoading(true);
      applyDocuments(page, await fetchDocuments(page));
    },
    [applyDocuments],
  );

  const reloadDocuments = useCallback(async () => {
    await Promise.all([loadDocuments(1), loadDefaultResumeId()]);
  }, [loadDocuments, loadDefaultResumeId]);

  useEffect(() => {
    fetchDocuments(1).then((result) => applyDocuments(1, result));
  }, [applyDocuments]);

  // The default pointer doesn't change between pages, so fetch it once on
  // mount (and again after a switch, via reloadDocuments) rather than per page.
  useEffect(() => {
    fetchDefaults().then(applyDefaults);
  }, [applyDefaults]);

  const documents: ProfileDocument[] = useMemo(() => {
    const resumeDocs: ProfileDocument[] = resumes.map((r) => ({
      id: r.id!,
      title: r.title,
      type: "resume" as const,
      createdAt: r.createdAt!,
      updatedAt: r.updatedAt!,
      jobCount: r._count?.Job ?? 0,
      FileId: r.FileId,
      isDefault: r.id === defaultResumeId,
      sectionCount: r._count?.ResumeSections ?? 0,
    }));
    const coverLetterDocs: ProfileDocument[] = coverLetters.map((cl) => ({
      id: cl.id!,
      title: cl.title,
      type: "cover-letter" as const,
      createdAt: cl.createdAt!,
      updatedAt: cl.updatedAt!,
      jobCount: cl._count?.Job ?? 0,
      content: cl.content,
    }));
    return [...resumeDocs, ...coverLetterDocs].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [resumes, coverLetters, defaultResumeId]);

  const totalDocuments = totalResumes + totalCoverLetters;

  const createResume = () => {
    setResumeToEdit(null);
    setResumeDialogOpen(true);
  };

  const createCoverLetter = () => {
    setCoverLetterToEdit(null);
    setCoverLetterDialogOpen(true);
  };

  const onEditResume = (doc: ProfileDocument) => {
    setResumeToEdit({
      id: doc.id,
      title: doc.title,
      FileId: doc.FileId,
    });
    setResumeDialogOpen(true);
  };

  const onCopyResume = (doc: ProfileDocument) => {
    setResumeToCopy(doc);
    setCopyDialogOpen(true);
  };

  const onEditCoverLetter = (doc: ProfileDocument) => {
    setCoverLetterToEdit({
      id: doc.id,
      title: doc.title,
      content: doc.content ?? "",
    });
    setCoverLetterDialogOpen(true);
  };

  const onExportCoverLetter = (doc: ProfileDocument) => {
    setExportLetter({ title: doc.title, content: doc.content ?? "" });
    setExportDialogOpen(true);
  };

  const setResumeId = (id: string) => {};

  return (
    <Card>
      <ResponsiveCardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle>Profile</CardTitle>
          {!loading && totalDocuments > 0 && (
            <RecordsCount count={documents.length} total={totalDocuments} label="documents" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  New
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={createResume}
              >
                Add New Resume
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={createCoverLetter}
              >
                Add New Cover Letter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateResume
            resumeDialogOpen={resumeDialogOpen}
            setResumeDialogOpen={setResumeDialogOpen}
            reloadResumes={reloadDocuments}
            resumeToEdit={resumeToEdit}
            setNewResumeId={setResumeId}
          />
          <CreateCoverLetter
            dialogOpen={coverLetterDialogOpen}
            setDialogOpen={setCoverLetterDialogOpen}
            coverLetterToEdit={coverLetterToEdit}
            reloadDocuments={reloadDocuments}
            contactInfo={contactInfo}
          />
          <CopyResumeDialog
            open={copyDialogOpen}
            setOpen={setCopyDialogOpen}
            sourceDoc={resumeToCopy}
            onCopied={reloadDocuments}
          />
          <CoverLetterExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            letter={exportLetter}
            contactInfo={contactInfo}
          />
        </div>
      </ResponsiveCardHeader>
      <CardContent>
        {loading && <Loading />}
        {documents.length > 0 && (
          <>
            <DocumentTable
              documents={documents}
              editResume={onEditResume}
              editCoverLetter={onEditCoverLetter}
              exportCoverLetter={onExportCoverLetter}
              copyResume={onCopyResume}
              reloadDocuments={reloadDocuments}
              defaultResumeId={defaultResumeId}
            />
          </>
        )}
        {resumes.length < totalResumes && (
          <div className="flex justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadDocuments(page + 1)}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileContainer;
