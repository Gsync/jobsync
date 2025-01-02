"use client";
import { useCallback, useEffect, useState } from "react";
import CreateResume from "./CreateResume";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getResumeList } from "@/actions/profile.actions";
import { Resume } from "@/models/profile.model";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import ResumeTable from "./ResumeTable";
import { toast } from "../ui/use-toast";
import { PlusCircle } from "lucide-react";
import { Button } from "../ui/button";

function ActivitiesContainer() {
  const recordsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);

  const [resumeToEdit, setResumeToEdit] = useState<Resume | null>(null);
  const [totalResumes, setTotalResumes] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const loadResumes = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total, success, message } = await getResumeList(
        page,
        recordsPerPage
      );
      if (success && data) {
        setResumes((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalResumes(total);
        setPage(page);
        setLoading(false);
      } else {
        setLoading(false);
        return toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
    },
    [recordsPerPage]
  );

  const reloadResumes = useCallback(async () => {
    await loadResumes(1);
  }, [loadResumes]);

  useEffect(() => {
    (async () => await loadResumes(1))();
  }, [loadResumes]);

  const createResume = () => {
    setResumeToEdit(null);
    setResumeDialogOpen(true);
  };

  const onEditResume = (resume: Resume) => {
    const _resumeToEdit = {
      id: resume.id,
      title: resume.title,
      FileId: resume.FileId,
    };
    setResumeToEdit(_resumeToEdit);
    setResumeDialogOpen(true);
  };

  const setResumeId = (id: string) => {};

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={createResume}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Create Resume
            </span>
          </Button>
          <CreateResume
            resumeDialogOpen={resumeDialogOpen}
            setResumeDialogOpen={setResumeDialogOpen}
            reloadResumes={reloadResumes}
            resumeToEdit={resumeToEdit}
            setNewResumeId={setResumeId}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading && <Loading />}
        {resumes.length > 0 && (
          <>
            <ResumeTable
              resumes={resumes}
              editResume={onEditResume}
              reloadResumes={reloadResumes}
            />
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <strong>
                {1} to {resumes.length}
              </strong>{" "}
              of
              <strong> {totalResumes}</strong> resumes
            </div>
          </>
        )}
        {resumes.length < totalResumes && (
          <div className="flex justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadResumes(page + 1)}
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
}

export default ActivitiesContainer;
