"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { File, ListFilter } from "lucide-react";
import MyJobsTable from "./MyJobsTable";
import { AddJob } from "./AddJob";
import {
  deleteJobById,
  getJobDetails,
  getJobsList,
} from "@/actions/job.actions";

type MyJobsProps = {
  statuses: { id: string; label: string; value: string }[];
  companies: any[];
  titles: { id: string; label: string; value: string }[];
  locations: { id: string; label: string; value: string }[];
  sources: { id: string; label: string; value: string }[];
};

function JobsContainer({
  statuses,
  companies,
  titles,
  locations,
  sources,
}: MyJobsProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [editJob, setEditJob] = useState(null);

  const jobsPerPage = 10;

  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  const loadJobs = async (page: number) => {
    const { data, total } = await getJobsList(page, jobsPerPage);

    setJobs(data);
    setTotalJobs(total);
  };

  const reloadJobs = () => {
    loadJobs(1);
  };

  const onDeleteJob = async (jobId: string) => {
    await deleteJobById(jobId);
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

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>My Jobs</CardTitle>
          <div className="flex items-center">
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Filter
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>
                    Applied
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Draft</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Interview</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Archived</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
