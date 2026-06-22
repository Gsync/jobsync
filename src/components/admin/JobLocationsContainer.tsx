"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobTitle } from "@prisma/client";
import JobLocationsTable from "./JobLocationsTable";
import { getJobLocationsList } from "@/actions/jobLocation.actions";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsCount } from "../RecordsCount";

function JobLocationsContainer() {
  const [locations, setLocations] = useState<JobTitle[]>([]);
  const [totalJobLocations, setTotalJobLocations] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const loadJobLocations = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total } = await getJobLocationsList(
        page,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        "applied"
      );
      if (data) {
        setLocations((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobLocations(total);
        setPage(page);
        setLoading(false);
      }
    },
    []
  );

  const reloadJobLocations = useCallback(async () => {
    await loadJobLocations(1);
  }, [loadJobLocations]);

  useEffect(() => {
    (async () => await loadJobLocations(1))();
  }, [loadJobLocations]);

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <CardHeader className="flex-row justify-between items-center">
            <div className="flex items-baseline gap-2">
              <CardTitle>Job Locations</CardTitle>
              {!loading && totalJobLocations > 0 && (
                <RecordsCount count={locations.length} total={totalJobLocations} label="job locations" />
              )}
            </div>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
                {/* <AddCompany reloadCompanies={reloadJobLocations} /> */}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <Loading />}
            {locations.length > 0 && (
              <>
                <JobLocationsTable
                  jobLocations={locations}
                  reloadJobLocations={reloadJobLocations}
                />
              </>
            )}
            {locations.length < totalJobLocations && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadJobLocations(page + 1)}
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

export default JobLocationsContainer;
