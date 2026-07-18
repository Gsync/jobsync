"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobTitle } from "@prisma/client";
import JobTitlesTable from "./JobTitlesTable";
import { getJobTitleList } from "@/actions/jobtitle.actions";
import Loading from "../Loading";
import { Loader } from "lucide-react";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

function JobTitlesContainer() {
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [totalJobTitles, setTotalJobTitles] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);
  const requestIdRef = useRef(0);
  const loadJobTitles = useCallback(
    async (page: number, search?: string) => {
      const requestId = ++requestIdRef.current;
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      const { data, total } = await getJobTitleList(
        page,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        "applied",
        search
      );
      if (requestId !== requestIdRef.current) return;
      if (data) {
        setTitles((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobTitles(total);
        setPage(page);
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    []
  );

  const reloadJobTitles = useCallback(async () => {
    await loadJobTitles(1, searchTerm || undefined);
  }, [loadJobTitles, searchTerm]);

  useEffect(() => {
    (async () => await loadJobTitles(1))();
  }, [loadJobTitles]);

  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadJobTitles(1, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const hasMoreJobTitles = titles.length < totalJobTitles;
  const sentinelRef = useInfiniteScroll(
    hasMoreJobTitles,
    initialLoading || loadingMore,
    useCallback(
      () => loadJobTitles(page + 1, searchTerm || undefined),
      [loadJobTitles, page, searchTerm]
    )
  );

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Job Titles</CardTitle>
              {!initialLoading && totalJobTitles > 0 && (
                <RecordsCount count={titles.length} total={totalJobTitles} label="job titles" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search job titles..."
              />
              {/* <AddCompany reloadCompanies={reloadJobTitles} /> */}
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {initialLoading && <Loading />}
            {titles.length > 0 && (
              <>
                <JobTitlesTable
                  jobTitles={titles}
                  reloadJobTitles={reloadJobTitles}
                />
              </>
            )}
            {hasMoreJobTitles && (
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

export default JobTitlesContainer;
