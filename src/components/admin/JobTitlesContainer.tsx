"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobTitle } from "@prisma/client";
import JobTitlesTable from "./JobTitlesTable";
import { getJobTitleList } from "@/actions/jobtitle.actions";

function JobTitlesContainer() {
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [totalJobTitles, setTotalJobTitles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [editJobTitle, setEditJobTitle] = useState(null);

  const recordsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const totalPages = Math.ceil(totalJobTitles / recordsPerPage);

  const loadJobTitles = useCallback(
    async (page: number) => {
      const { data, total } = await getJobTitleList(
        page,
        recordsPerPage,
        "applied"
      );
      setTitles(data);
      setTotalJobTitles(total);
    },
    [recordsPerPage]
  );

  const reloadJobTitles = () => {
    loadJobTitles(1);
  };

  const resetEditJobTitle = () => {
    setEditJobTitle(null);
  };

  useEffect(() => {
    loadJobTitles(currentPage);
  }, [currentPage, loadJobTitles]);

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Job Titles</CardTitle>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
                {/* <AddCompany reloadCompanies={reloadJobTitles} /> */}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <JobTitlesTable
              jobTitles={titles}
              currentPage={currentPage}
              totalPages={totalPages}
              recordsPerPage={recordsPerPage}
              totalJobTitles={totalJobTitles}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default JobTitlesContainer;
