"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobTitle } from "@prisma/client";
import JobLocationsTable from "./JobLocationsTable";
import { getJobLocationsList } from "@/actions/jobLocation.actions";
import Loading from "../Loading";
import { Loader } from "lucide-react";
import { RecordsCount } from "../RecordsCount";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

function JobLocationsContainer() {
  const [locations, setLocations] = useState<JobTitle[]>([]);
  const [totalJobLocations, setTotalJobLocations] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const requestIdRef = useRef(0);
  const loadJobLocations = useCallback(
    async (page: number) => {
      const requestId = ++requestIdRef.current;
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      const { data, total } = await getJobLocationsList(
        page,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        "applied"
      );
      if (requestId !== requestIdRef.current) return;
      if (data) {
        setLocations((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobLocations(total);
        setPage(page);
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    []
  );

  const reloadJobLocations = useCallback(async () => {
    await loadJobLocations(1);
  }, [loadJobLocations]);

  useEffect(() => {
    (async () => await loadJobLocations(1))();
  }, [loadJobLocations]);

  const hasMoreJobLocations = locations.length < totalJobLocations;
  const sentinelRef = useInfiniteScroll(
    hasMoreJobLocations,
    initialLoading || loadingMore,
    useCallback(() => loadJobLocations(page + 1), [loadJobLocations, page])
  );

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Job Locations</CardTitle>
              {!initialLoading && totalJobLocations > 0 && (
                <RecordsCount count={locations.length} total={totalJobLocations} label="job locations" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {/* <AddCompany reloadCompanies={reloadJobLocations} /> */}
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {initialLoading && <Loading />}
            {locations.length > 0 && (
              <>
                <JobLocationsTable
                  jobLocations={locations}
                  reloadJobLocations={reloadJobLocations}
                />
              </>
            )}
            {hasMoreJobLocations && (
              <div ref={sentinelRef} className="flex justify-center p-4">
                {loadingMore && (
                  <Loader className="h-5 w-5 animate-spin text-blue-500" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default JobLocationsContainer;
