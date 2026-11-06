"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getJobsList } from "@/actions/job.actions";
import { toastError } from "@/lib/toast";
import {
  JobFacets,
  JobResponse,
  JobSortField,
  JobsViewMode,
} from "@/models/job.model";
import { hasJobFacets } from "@/lib/jobs/jobFacets";
import type { SortState } from "@/models/sort.model";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { useHydrated } from "@/hooks/useHydrated";

// Owns the job list itself: pagination, search, view mode, infinite scroll,
// and the reload triggered when the agent chat writes job data.
export function useJobsList({
  companyFilter,
  appliedFilter,
  titleFilter,
  locationFilter,
  sourceFilter,
  facets,
  sort,
}: {
  companyFilter: string | null;
  appliedFilter: boolean;
  titleFilter: string | null;
  locationFilter: string | null;
  sourceFilter: string | null;
  facets: JobFacets;
  sort: SortState<JobSortField> | null;
}) {
  const { jobWrites } = useAgentChat();
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const hydrated = useHydrated();
  const [chosenViewMode, setViewMode] = useState<JobsViewMode | null>(null);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  // True from the start: the mount load sets no state before its reply.
  const [initialLoading, setInitialLoading] = useState(true);
  // False until page 1 has loaded, so an empty list isn't read as "no matches"
  // before the first fetch or after a failed one.
  const [listLoaded, setListLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasSearched = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);
  const sortRef = useRef(sort);
  const lastSort = useRef(sort);

  // Read after hydration: localStorage is unavailable during SSR, so reading
  // it in the first render would cause a hydration mismatch.
  const saved = hydrated
    ? getFromLocalStorage(APP_CONSTANTS.JOBS_VIEW_MODE_STORAGE_KEY, null)
    : null;
  const savedViewMode = saved === "cards" || saved === "table" ? saved : null;
  const viewMode: JobsViewMode = chosenViewMode ?? savedViewMode ?? "table";

  const onChangeViewMode = (mode: JobsViewMode) => {
    setViewMode(mode);
    saveToLocalStorage(APP_CONSTANTS.JOBS_VIEW_MODE_STORAGE_KEY, mode);
  };

  const jobsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const fetchJobsPage = useCallback(
    (page: number, search?: string) =>
      getJobsList(
        page,
        jobsPerPage,
        hasJobFacets(facets) ? facets : undefined,
        search,
        companyFilter || undefined,
        appliedFilter || undefined,
        titleFilter || undefined,
        locationFilter || undefined,
        sourceFilter || undefined,
        sortRef.current ?? undefined,
      ),
    [
      jobsPerPage,
      facets,
      companyFilter,
      appliedFilter,
      titleFilter,
      locationFilter,
      sourceFilter,
    ],
  );

  // Only the newest request may write: a slower response to an older
  // sort, search or page must not replace or extend the newer list.
  const applyJobsPage = useCallback(
    (
      request: number,
      page: number,
      result: Awaited<ReturnType<typeof getJobsList>>,
    ) => {
      if (request !== requestSeq.current) return;
      const { success, data, total, message } = result;
      if (success && data) {
        setJobs((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobs(total);
        setPage(page);
        setListLoaded(true);
      } else {
        toastError(message);
        if (page === 1) setListLoaded(false);
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [],
  );

  const loadJobs = useCallback(
    async (page: number, search?: string) => {
      const request = ++requestSeq.current;
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      applyJobsPage(request, page, await fetchJobsPage(page, search));
    },
    [fetchJobsPage, applyJobsPage],
  );

  // A filter change or an agent write refetches page 1 (effects below), so
  // either re-raises the spinner here.
  const reloadKey = JSON.stringify([
    facets,
    companyFilter,
    appliedFilter,
    titleFilter,
    locationFilter,
    sourceFilter,
    jobWrites,
  ]);
  const [prevReloadKey, setPrevReloadKey] = useState(reloadKey);
  if (reloadKey !== prevReloadKey) {
    setPrevReloadKey(reloadKey);
    setInitialLoading(true);
  }

  const reloadJobs = useCallback(async () => {
    await loadJobs(1, searchTerm || undefined);
  }, [loadJobs, searchTerm]);

  useEffect(() => {
    const request = ++requestSeq.current;
    fetchJobsPage(1, searchTerm || undefined).then((result) =>
      applyJobsPage(request, 1, result),
    );
    // Search has its own debounced effect below; keying on it here too
    // would fire a second, undebounced request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchJobsPage, applyJobsPage]);

  // The agent saves server-side, so only this counter tells us a row appeared
  // or a match score landed. Deps are the counter alone: the fetch changes
  // with every filter and keystroke, and the effects above already cover those.
  useEffect(() => {
    if (jobWrites === 0) return;
    const request = ++requestSeq.current;
    fetchJobsPage(1, searchTerm || undefined).then((result) =>
      applyJobsPage(request, 1, result),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobWrites]);

  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    // Skip only on initial mount when search is empty
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadJobs(1, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Reload page 1 on a real sort change, keeping the filter and search. The
  // equality check skips mount (and StrictMode's re-run) — the mount effect
  // already loads.
  useEffect(() => {
    sortRef.current = sort;
    if (lastSort.current === sort) return;
    lastSort.current = sort;
    loadJobs(1, searchTerm || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Infinite scroll: auto-load next page when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !initialLoading &&
          !loadingMore &&
          jobs.length < totalJobs
        ) {
          loadJobs(page + 1, searchTerm || undefined);
        }
      },
      { threshold: APP_CONSTANTS.INTERSECTION_OBSERVER_THRESHOLD },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    jobs.length,
    totalJobs,
    page,
    searchTerm,
    initialLoading,
    loadingMore,
    loadJobs,
  ]);

  return {
    jobs,
    viewMode,
    onChangeViewMode,
    page,
    totalJobs,
    searchTerm,
    setSearchTerm,
    initialLoading,
    listLoaded,
    loadingMore,
    loadJobs,
    reloadJobs,
    sentinelRef,
  };
}
