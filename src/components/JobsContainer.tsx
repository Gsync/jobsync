"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { File, ListFilter } from "lucide-react";
import MyJobsTable from "./MyJobsTable";
import { AddJob } from "./AddJob";
import {
  deleteJobById,
  getJobDetails,
  getJobsList,
} from "@/actions/job.actions";
import { toast } from "./ui/use-toast";
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
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [editJob, setEditJob] = useState(null);

  const jobsPerPage = 10;

  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  const loadJobs = async (page: number, filter?: string) => {
    const { data, total } = await getJobsList(page, jobsPerPage, filter);
    setJobs(data);
    setTotalJobs(total);
  };

  const reloadJobs = () => {
    loadJobs(1);
  };

  const onDeleteJob = async (jobId: string) => {
    const res = await deleteJobById(jobId);
    if (res) {
      toast({
        description: `Job has been deleted successfully`,
      });
    }
    reloadJobs();
  };

  const onEditJob = async (jobId: string) => {
    const job = await getJobDetails(jobId);
    setEditJob(job);
  };

  const resetEditJob = () => {
    setEditJob(null);
  };

  useEffect(() => {
    loadJobs(currentPage);
  }, [currentPage]);

  const onFilterChange = (filterBy: string) => {
    filterBy === "none" ? reloadJobs() : loadJobs(1, filterBy);
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
                    <DropdownMenuSeparator />
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
          <MyJobsTable
            jobs={jobs}
            currentPage={currentPage}
            totalPages={totalPages}
            jobsPerPage={jobsPerPage}
            totalJobs={totalJobs}
            onPageChange={setCurrentPage}
            deleteJob={onDeleteJob}
            editJob={onEditJob}
          />
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
    </>
  );
}

export default JobsContainer;
