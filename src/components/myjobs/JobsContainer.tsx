"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { File, ListFilter, Loader, Search, X } from "lucide-react";
import {
  deleteJobById,
  getJobDetails,
  getJobsList,
  updateJobStatus,
} from "@/actions/job.actions";
import { toast } from "../ui/use-toast";
import {
  Company,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
} from "@/models/job.model";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddJob } from "./AddJob";
import MyJobsTable from "./MyJobsTable";
import { NoteDialog } from "./NoteDialog";
import { format } from "date-fns";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";

type MyJobsProps = {
  statuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  tags: Tag[];
};

function JobsContainer({
  statuses,
  companies,
  titles,
  locations,
  sources,
  tags,
}: MyJobsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryParams = useSearchParams();
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(queryParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [queryParams],
  );
  const [companyFilter, setCompanyFilter] = useState<string | null>(
    queryParams.get("company"),
  );
  const [titleFilter, setTitleFilter] = useState<string | null>(
    queryParams.get("title"),
  );
  const [locationFilter, setLocationFilter] = useState<string | null>(
    queryParams.get("location"),
  );
  const [sourceFilter, setSourceFilter] = useState<string | null>(
    queryParams.get("source"),
  );
  const [appliedFilter, setAppliedFilter] = useState(
    queryParams.get("applied") === "true",
  );
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [filterKey, setFilterKey] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [editJob, setEditJob] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteJobId, setNoteJobId] = useState("");
  const hasSearched = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const companyLabel = companyFilter
    ? companies.find((c) => c.value === companyFilter)?.label
    : null;

  const titleLabel = titleFilter
    ? titles.find((t) => t.value === titleFilter)?.label
    : null;

  const locationLabel = locationFilter
    ? locations.find((l) => l.value === locationFilter)?.label
    : null;

  const sourceLabel = sourceFilter
    ? sources.find((s) => s.value === sourceFilter)?.label
    : null;

  const clearCompanyFilter = () => {
    setCompanyFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearTitleFilter = () => {
    setTitleFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  const clearSourceFilter = () => {
    setSourceFilter(null);
    setAppliedFilter(false);
    router.push(pathname);
  };

  useEffect(() => {
    const cp = queryParams.get("company");
    const tp = queryParams.get("title");
    const lp = queryParams.get("location");
    const sp = queryParams.get("source");
    const ap = queryParams.get("applied") === "true";
    setCompanyFilter(cp);
    setTitleFilter(tp);
    setLocationFilter(lp);
    setSourceFilter(sp);
    setAppliedFilter(ap);
  }, [queryParams]);

  const jobsPerPage = recordsPerPage;

  const loadJobs = useCallback(
    async (page: number, filter?: string, search?: string) => {
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      const { success, data, total, message } = await getJobsList(
        page,
        jobsPerPage,
        filter,
        search,
        companyFilter || undefined,
        appliedFilter || undefined,
        titleFilter || undefined,
        locationFilter || undefined,
        sourceFilter || undefined,
      );
      if (success && data) {
        setJobs((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobs(total);
        setPage(page);
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [jobsPerPage, companyFilter, appliedFilter, titleFilter, locationFilter, sourceFilter],
  );

  const reloadJobs = useCallback(async () => {
    await loadJobs(1, undefined, searchTerm || undefined);
    if (filterKey) {
      setFilterKey(undefined);
    }
  }, [loadJobs, filterKey, searchTerm]);

  const onDeleteJob = async (jobId: string) => {
    const { res, success, message } = await deleteJobById(jobId);
    if (success) {
      toast({
        variant: "success",
        description: `Job has been deleted successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
    reloadJobs();
  };

  const onEditJob = async (jobId: string) => {
    const { job, success, message } = await getJobDetails(jobId);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
      return;
    }
    setEditJob(job);
  };

  const onChangeJobStatus = async (jobId: string, jobStatus: JobStatus) => {
    const { success, message } = await updateJobStatus(jobId, jobStatus);
    if (success) {
      router.refresh();
      toast({
        variant: "success",
        description: `Job has been updated successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
    reloadJobs();
  };

  const resetEditJob = () => {
    setEditJob(null);
  };

  const onAddNote = (jobId: string) => {
    setNoteJobId(jobId);
    setNoteDialogOpen(true);
  };

  useEffect(() => {
    (async () => await loadJobs(1))();
  }, [loadJobs]);

  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    // Skip only on initial mount when search is empty
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadJobs(1, filterKey, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

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
          loadJobs(page + 1, filterKey, searchTerm || undefined);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    jobs.length,
    totalJobs,
    page,
    filterKey,
    searchTerm,
    initialLoading,
    loadingMore,
    loadJobs,
  ]);

  const onFilterChange = (filterBy: string) => {
    if (filterBy === "none") {
      setFilterKey(undefined);
      loadJobs(1, undefined, searchTerm || undefined);
    } else {
      setFilterKey(filterBy);
      loadJobs(1, filterBy, searchTerm || undefined);
    }
  };

  const downloadJobsList = async () => {
    try {
      const res = await fetch("/api/jobs/export", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to download jobs!");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jobsync-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        variant: "success",
        title: "Downloaded successfully!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }
  };

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <CardTitle>My Jobs</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {companyLabel && (
              <button
                onClick={clearCompanyFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {companyLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {titleLabel && (
              <button
                onClick={clearTitleFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {titleLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {locationLabel && (
              <button
                onClick={clearLocationFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {locationLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {sourceLabel && (
              <button
                onClick={clearSourceFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {sourceLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="relative flex-1 min-w-[140px] sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search jobs..."
                className="pl-8 h-8 w-full sm:w-[150px] lg:w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterKey} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[120px] h-8">
                <ListFilter className="h-3.5 w-3.5" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filter by</SelectLabel>
                  <SelectSeparator />
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="PT">Part-time</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={initialLoading}
              onClick={downloadJobsList}
            >
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            <AddJob
              jobStatuses={statuses}
              companies={companies}
              jobTitles={titles}
              locations={locations}
              jobSources={sources}
              tags={tags}
              editJob={editJob}
              resetEditJob={resetEditJob}
            />
          </div>
        </CardHeader>
        <CardContent>
          {initialLoading && <Loading />}
          {jobs.length > 0 && (
            <>
              <MyJobsTable
                jobs={jobs}
                jobStatuses={statuses}
                deleteJob={onDeleteJob}
                editJob={onEditJob}
                onChangeJobStatus={onChangeJobStatus}
                onAddNote={onAddNote}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4">
                <RecordsCount
                  count={jobs.length}
                  total={totalJobs}
                  label="jobs"
                />
                {totalJobs > APP_CONSTANTS.RECORDS_PER_PAGE && (
                  <RecordsPerPageSelector
                    value={recordsPerPage}
                    onChange={setRecordsPerPage}
                  />
                )}
              </div>
            </>
          )}
          {jobs.length < totalJobs && (
            <div ref={sentinelRef} className="flex justify-center p-4">
              {loadingMore && (
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </div>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        jobId={noteJobId}
        onSaved={() => reloadJobs()}
      />
    </>
  );
}

export default JobsContainer;
