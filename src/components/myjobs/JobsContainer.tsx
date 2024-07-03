"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { File, ListFilter } from "lucide-react";
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
import { MY_JOBS_DATA } from "@/lib/data/myJobsData";
import { getMockJobsList } from "@/lib/mock.utils";
import { AddJob } from "./AddJob";
import MyJobsTable from "./MyJobsTable";

type MyJobsProps = {
  statuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
};

function JobsContainer({
  statuses,
  companies,
  titles,
  locations,
  sources,
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
    [queryParams]
  );
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(
    Number(queryParams.get("page")) || 1
  );
  const [totalJobs, setTotalJobs] = useState(0);
  const [editJob, setEditJob] = useState(null);
  const [loading, setLoading] = useState(false);

  const jobsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  const loadJobs = useCallback(
    async (page: number, filter?: string) => {
      setLoading(true);
      // const { data, total } = await getJobsList(page, jobsPerPage, filter);
      const { data, total } = await getMockJobsList(page, jobsPerPage, filter);
      setJobs(data);
      setTotalJobs(total);
      if (data) {
        setLoading(false);
      }
    },
    [jobsPerPage]
  );

  const reloadJobs = () => {
    loadJobs(1);
  };

  const onDeleteJob = async (jobId: string) => {
    const res = await deleteJobById(jobId);
    if (res) {
      toast({
        variant: "success",
        description: `Job has been deleted successfully`,
      });
    }
    reloadJobs();
  };

  const onEditJob = async (jobId: string) => {
    const job = await getJobDetails(jobId);
    setEditJob(job);
  };

  const onChangeJobStatus = async (jobId: string, jobStatus: JobStatus) => {
    const job = await updateJobStatus(jobId, jobStatus);
    if (job) {
      toast({
        variant: "success",
        description: `Job has been updated successfully`,
      });
    }
    reloadJobs();
  };

  const resetEditJob = () => {
    setEditJob(null);
  };

  useEffect(() => {
    loadJobs(currentPage);
  }, [currentPage, loadJobs]);

  const onFilterChange = (filterBy: string) => {
    filterBy === "none" ? reloadJobs() : loadJobs(1, filterBy);
  };

  const onPageChange = (page: number) => {
    setCurrentPage(page);
    router.push(pathname + "?" + createQueryString("page", page.toString()));
  };

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>My Jobs</CardTitle>
          <div className="flex items-center">
            <div className="ml-auto flex items-center gap-2">
              <Select onValueChange={onFilterChange}>
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
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 gap-1">
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
                reloadJobs={reloadJobs}
                editJob={editJob}
                resetEditJob={resetEditJob}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!loading ? (
            <MyJobsTable
              jobs={jobs}
              jobStatuses={statuses}
              currentPage={currentPage}
              totalPages={totalPages}
              jobsPerPage={jobsPerPage}
              totalJobs={totalJobs}
              onPageChange={onPageChange}
              deleteJob={onDeleteJob}
              editJob={onEditJob}
              onChangeJobStatus={onChangeJobStatus}
            />
          ) : (
            <Loading />
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
    </>
  );
}

export default JobsContainer;
