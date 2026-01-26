"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobTitle } from "@prisma/client";
import JobTitlesTable from "./JobTitlesTable";
import { getJobTitleList } from "@/actions/jobtitle.actions";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";

function JobTitlesContainer() {
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [totalJobTitles, setTotalJobTitles] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );

  const loadJobTitles = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total } = await getJobTitleList(
        page,
        recordsPerPage,
        "applied"
      );
      if (data) {
        setTitles((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobTitles(total);
        setPage(page);
        setLoading(false);
      }
    },
    [recordsPerPage]
  );

  const reloadJobTitles = useCallback(async () => {
    await loadJobTitles(1);
  }, [loadJobTitles]);

  useEffect(() => {
    (async () => await loadJobTitles(1))();
  }, [loadJobTitles, recordsPerPage]);

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
            {loading && <Loading />}
            {titles.length > 0 && (
              <>
                <JobTitlesTable
                  jobTitles={titles}
                  reloadJobTitles={reloadJobTitles}
                />
                <div className="flex items-center justify-between mt-4">
                  <RecordsCount
                    count={titles.length}
                    total={totalJobTitles}
                    label="job titles"
                  />
                  {totalJobTitles > APP_CONSTANTS.RECORDS_PER_PAGE && (
                    <RecordsPerPageSelector
                      value={recordsPerPage}
                      onChange={setRecordsPerPage}
                    />
                  )}
                </div>
              </>
            )}
            {titles.length < totalJobTitles && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadJobTitles(page + 1)}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default JobTitlesContainer;
