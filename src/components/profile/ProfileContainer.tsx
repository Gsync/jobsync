"use client";
import { useCallback, useEffect, useState } from "react";
import CreateResume from "./CreateResume";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getResumeList } from "@/actions/profile.actions";
import { Resume } from "@/models/profile.model";
import { useSearchParams } from "next/navigation";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import ResumeTable from "./ResumeTable";
import { toast } from "../ui/use-toast";
import { PlusCircle } from "lucide-react";
import { Button } from "../ui/button";

function ActivitiesContainer() {
  const queryParams = useSearchParams();
  const recordsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);

  const [resumeToEdit, setResumeToEdit] = useState<Resume | null>(null);
  const [totalResumes, setTotalResumes] = useState(0);
  const [currentPage, setCurrentPage] = useState(
    Number(queryParams.get("page")) || 1
  );
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(totalResumes / recordsPerPage);

  const loadResumes = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total, success, message } = await getResumeList(
        page,
        recordsPerPage
      );
      if (success) {
        setResumes(data);
        setTotalResumes(total);
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

  const reloadResumes = async () => {
    await loadResumes(1);
  };

  useEffect(() => {
    loadResumes(currentPage);
  }, [currentPage, loadResumes]);

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
        {!loading ? (
          <ResumeTable
            resumes={resumes}
            currentPage={currentPage}
            totalPages={totalPages}
            recordsPerPage={recordsPerPage}
            totalResumes={totalResumes}
            // onPageChange={onPageChange}
            editResume={onEditResume}
            reloadResumes={reloadResumes}
          />
        ) : (
          <Loading />
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
