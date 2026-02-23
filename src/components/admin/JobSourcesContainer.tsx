"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobSource } from "@/models/job.model";
import JobSourcesTable from "./JobSourcesTable";
import { getJobSourceList } from "@/actions/jobSource.actions";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";

function JobSourcesContainer() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [totalJobSources, setTotalJobSources] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );

  const loadJobSources = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total } = await getJobSourceList(
        page,
        recordsPerPage,
        "applied"
      );
      if (data) {
        setSources((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobSources(total);
        setPage(page);
        setLoading(false);
      }
    },
    [recordsPerPage]
  );

  const reloadJobSources = useCallback(async () => {
    await loadJobSources(1);
  }, [loadJobSources]);

  useEffect(() => {
    (async () => await loadJobSources(1))();
  }, [loadJobSources, recordsPerPage]);

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Job Sources</CardTitle>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <Loading />}
            {sources.length > 0 && (
              <>
                <JobSourcesTable
                  jobSources={sources}
                  reloadJobSources={reloadJobSources}
                />
                <div className="flex items-center justify-between mt-4">
                  <RecordsCount
                    count={sources.length}
                    total={totalJobSources}
                    label="job sources"
                  />
                  {totalJobSources > APP_CONSTANTS.RECORDS_PER_PAGE && (
                    <RecordsPerPageSelector
                      value={recordsPerPage}
                      onChange={setRecordsPerPage}
                    />
                  )}
                </div>
              </>
            )}
            {sources.length < totalJobSources && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadJobSources(page + 1)}
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

export default JobSourcesContainer;
