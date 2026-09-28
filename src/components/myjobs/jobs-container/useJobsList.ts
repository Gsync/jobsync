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
  const [viewMode, setViewMode] = useState<JobsViewMode>("table");
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoading, setInitialLoading] = useState(false);
  // False until page 1 has loaded, so an empty list isn't read as "no matches"
  // before the first fetch or after a failed one.
  const [listLoaded, setListLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasSearched = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);
  const sortRef = useRef(sort);
  const lastSort = useRef(sort);

  // Read after mount: localStorage is unavailable during SSR, so seeding the
  // initial state from it would cause a hydration mismatch.
  useEffect(() => {
    const saved = getFromLocalStorage(
      APP_CONSTANTS.JOBS_VIEW_MODE_STORAGE_KEY,
      null,
    );
    if (saved === "cards" || saved === "table") setViewMode(saved);
  }, []);

  const onChangeViewMode = (mode: JobsViewMode) => {
    setViewMode(mode);
    saveToLocalStorage(APP_CONSTANTS.JOBS_VIEW_MODE_STORAGE_KEY, mode);
  };

  const jobsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const loadJobs = useCallback(
    async (page: number, search?: string) => {
      // Only the newest request may write: a slower response to an older
      // sort, search or page must not replace or extend the newer list.
      const request = ++requestSeq.current;
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      const { success, data, total, message } = await getJobsList(
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
      );
      if (request !== requestSeq.current) return;
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

  const reloadJobs = useCallback(async () => {
    await loadJobs(1, searchTerm || undefined);
  }, [loadJobs, searchTerm]);

  useEffect(() => {
    (async () => await loadJobs(1, searchTerm || undefined))();
    // Search has its own debounced effect below; keying on it here too
    // would fire a second, undebounced request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadJobs]);

  // The agent saves server-side, so only this counter tells us a row appeared
  // or a match score landed. Deps are the counter alone: reloadJobs changes
  // with every filter and keystroke, and the effects above already cover those.
  useEffect(() => {
    if (jobWrites === 0) return;
    void reloadJobs();
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
