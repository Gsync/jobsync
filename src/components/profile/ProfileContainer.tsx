"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import CreateResume from "./CreateResume";
import CreateCoverLetter from "./CreateCoverLetter";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getResumeList } from "@/actions/profile.actions";
import { getCoverLetterList } from "@/actions/coverLetter.actions";
import {
  CoverLetter,
  ProfileDocument,
  Resume,
} from "@/models/profile.model";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import DocumentTable from "./ResumeTable";
import { toast } from "../ui/use-toast";
import { ChevronDown, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ProfileContainer = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [coverLetterDialogOpen, setCoverLetterDialogOpen] = useState(false);

  const [resumeToEdit, setResumeToEdit] = useState<Resume | null>(null);
  const [coverLetterToEdit, setCoverLetterToEdit] =
    useState<CoverLetter | null>(null);
  const [totalResumes, setTotalResumes] = useState<number>(0);
  const [totalCoverLetters, setTotalCoverLetters] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );

  const loadResumes = useCallback(
    async (page: number) => {
      const { data, total, success, message } = await getResumeList(
        page,
        recordsPerPage,
      );
      if (success && data) {
        setResumes((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalResumes(total);
        setPage(page);
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
    },
    [recordsPerPage],
  );

  const loadCoverLetters = useCallback(async () => {
    const { data, total, success, message } = await getCoverLetterList(
      1,
      100,
    );
    if (success && data) {
      setCoverLetters(data);
      setTotalCoverLetters(total);
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  }, []);

  const loadDocuments = useCallback(
    async (page: number) => {
      setLoading(true);
      await Promise.all([loadResumes(page), loadCoverLetters()]);
      setLoading(false);
    },
    [loadResumes, loadCoverLetters],
  );

  const reloadDocuments = useCallback(async () => {
    await loadDocuments(1);
  }, [loadDocuments]);

  useEffect(() => {
    (async () => await loadDocuments(1))();
  }, [loadDocuments, recordsPerPage]);

  const documents: ProfileDocument[] = useMemo(() => {
    const resumeDocs: ProfileDocument[] = resumes.map((r) => ({
      id: r.id!,
      title: r.title,
      type: "resume" as const,
      createdAt: r.createdAt!,
      updatedAt: r.updatedAt!,
      jobCount: r._count?.Job ?? 0,
      FileId: r.FileId,
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
    return [...resumeDocs, ...coverLetterDocs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [resumes, coverLetters]);

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

  const onEditCoverLetter = (doc: ProfileDocument) => {
    setCoverLetterToEdit({
      id: doc.id,
      title: doc.title,
      content: doc.content ?? "",
    });
    setCoverLetterDialogOpen(true);
  };

  const setResumeId = (id: string) => {};

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center">
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
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading && <Loading />}
        {documents.length > 0 && (
          <>
            <DocumentTable
              documents={documents}
              editResume={onEditResume}
              editCoverLetter={onEditCoverLetter}
              reloadDocuments={reloadDocuments}
            />
            <div className="flex items-center justify-between mt-4">
              <RecordsCount
                count={documents.length}
                total={totalDocuments}
                label="documents"
              />
              {totalDocuments > APP_CONSTANTS.RECORDS_PER_PAGE && (
                <RecordsPerPageSelector
                  value={recordsPerPage}
                  onChange={setRecordsPerPage}
                />
              )}
            </div>
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
