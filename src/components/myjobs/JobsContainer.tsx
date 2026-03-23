"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "@/i18n/use-translations";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { File, ListFilter, Search } from "lucide-react";
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
  const { t } = useTranslations();
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
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [filterKey, setFilterKey] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [editJob, setEditJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteJobId, setNoteJobId] = useState("");
  const hasSearched = useRef(false);

  const jobsPerPage = recordsPerPage;

  const loadJobs = useCallback(
    async (page: number, filter?: string, search?: string) => {
      setLoading(true);
      const { success, data, total, message } = await getJobsList(
        page,
        jobsPerPage,
        filter,
        search,
      );
      if (success && data) {
        setJobs((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobs(total);
        setPage(page);
        setLoading(false);
      } else {
        toast({
          variant: "destructive",
          title: t("jobs.error"),
          description: message,
        });
        setLoading(false);
        return;
      }
    },
    [jobsPerPage],
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
        description: t("jobs.deletedSuccess"),
      });
    } else {
      toast({
        variant: "destructive",
        title: t("jobs.error"),
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
        title: t("jobs.error"),
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
        description: t("jobs.updatedSuccess"),
      });
    } else {
      toast({
        variant: "destructive",
        title: t("jobs.error"),
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
        throw new Error(t("jobs.downloadFailed"));
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
        title: t("jobs.downloadSuccess"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("jobs.error"),
        description:
          error instanceof Error ? error.message : t("jobs.downloadFailed"),
      });
    }
  };

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <CardTitle>{t("jobs.title")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px] sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("jobs.searchPlaceholder")}
                className="pl-8 h-8 w-full sm:w-[150px] lg:w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterKey} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[120px] h-8">
                <ListFilter className="h-3.5 w-3.5" />
                <SelectValue placeholder={t("jobs.filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t("jobs.filterBy")}</SelectLabel>
                  <SelectSeparator />
                  <SelectItem value="none">{t("jobs.none")}</SelectItem>
                  <SelectItem value="applied">{t("jobs.applied")}</SelectItem>
                  <SelectItem value="interview">{t("jobs.interview")}</SelectItem>
                  <SelectItem value="draft">{t("jobs.draft")}</SelectItem>
                  <SelectItem value="rejected">{t("jobs.rejected")}</SelectItem>
                  <SelectItem value="PT">{t("jobs.partTime")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={loading}
              onClick={downloadJobsList}
            >
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                {t("jobs.export")}
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
          {loading && <Loading />}
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
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  loadJobs(page + 1, filterKey, searchTerm || undefined)
                }
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? t("common.loading") : t("jobs.loadMore")}
              </Button>
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
