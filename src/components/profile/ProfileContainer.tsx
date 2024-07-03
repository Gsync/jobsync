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
import { getMockResumeList } from "@/lib/mock.utils";

function ActivitiesContainer() {
  const queryParams = useSearchParams();
  const recordsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const [resumes, setResumes] = useState<Resume[]>([]);
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
      // const { data, total, success } = await getResumeList(
      //   page,
      //   recordsPerPage
      // );
      const { data, total, success } = await getMockResumeList();
      setResumes(data);
      setTotalResumes(total);
      if (success) {
        setLoading(false);
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

  const onEditResume = (resume: Resume) => {
    const _resumeToEdit = { id: resume.id, title: resume.title };
    setResumeToEdit(_resumeToEdit);
  };

  const resetResumeToEdit = () => {
    setResumeToEdit(null);
  };

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center">
          <CreateResume
            reloadResumes={reloadResumes}
            resumeToEdit={resumeToEdit}
            resetResumeToEdit={resetResumeToEdit}
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
          />
        ) : (
          <Loading />
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
