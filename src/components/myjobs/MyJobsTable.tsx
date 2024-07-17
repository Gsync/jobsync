"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import {
  ListCollapse,
  MoreHorizontal,
  Pencil,
  Tags,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button, buttonVariants } from "../ui/button";
import { useState } from "react";
import { TablePagination } from "../TablePagination";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import JobDetails from "./JobDetails";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { JobResponse, JobStatus } from "@/models/job.model";

type MyJobsTableProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  currentPage: number;
  totalPages: number;
  totalJobs: number;
  jobsPerPage: number;
  onPageChange: (n: number) => void;
  deleteJob: (id: string) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
};

function MyJobsTable({
  jobs,
  jobStatuses,
  currentPage,
  totalPages,
  totalJobs,
  jobsPerPage,
  onPageChange,
  deleteJob,
  editJob,
  onChangeJobStatus,
}: MyJobsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [curJobId, setCurJobId] = useState("");
  const [jobIdToDelete, setJobIdToDelete] = useState("");

  const startPostIndex = (currentPage - 1) * jobsPerPage + 1;
  const endPostIndex = Math.min(currentPage * jobsPerPage, totalJobs);

  const viewJobDetails = (jobId: string) => {
    setCurJobId(jobId);
    setDialogOpen(true);
  };

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Company Logo</span>
            </TableHead>
            <TableHead className="hidden md:table-cell">Date Applied</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="hidden md:table-cell">Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Source</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job: JobResponse) => {
            return (
              <TableRow
                key={job.id}
                className="cursor-pointer"
                // onClick={() => viewJobDetails(job?.id)}
              >
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt="Company logo"
                    className="aspect-square rounded-md object-cover"
                    height="32"
                    src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
                    width="32"
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell w-[120px]">
                  {job.appliedDate ? format(job.appliedDate, "PP") : "N/A"}
                </TableCell>
                <TableCell className="font-medium">
                  {job.JobTitle?.label}
                </TableCell>
                <TableCell className="font-medium">
                  {job.Company?.label}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {job.Location?.label}
                </TableCell>
                <TableCell>
                  {new Date() > job.dueDate && job.Status?.value === "draft" ? (
                    <Badge className="bg-red-500">Expired</Badge>
                  ) : (
                    <Badge
                      className={cn(
                        "w-[70px] justify-center",
                        job.Status?.value === "applied" && "bg-cyan-500",
                        job.Status?.value === "interview" && "bg-green-500"
                      )}
                    >
                      {job.Status?.label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {job.JobSource?.label}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        data-testid="job-actions-menu-btn"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => viewJobDetails(job?.id)}
                        >
                          <ListCollapse className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => editJob(job.id)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Job
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Tags className="mr-2 h-4 w-4" />
                            Change status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="p-0">
                              {jobStatuses.map((status) => (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  key={status.id}
                                  onSelect={(_) => {
                                    onChangeJobStatus(job.id, status);
                                  }}
                                  disabled={status.id === job.Status.id}
                                >
                                  <span>{status.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                          {/* <Command>
                              <CommandList>
                                <CommandGroup>
                                  {jobStatuses.map((status) => (
                                    <CommandItem
                                      className="cursor-pointer"
                                      key={status.id}
                                      value={status.label}
                                      onSelect={(value) => {
                                        onChangeJobStatus(value);
                                      }}
                                    >
                                      {status.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command> */}
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
                          onClick={() => onDeleteJob(job.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent className="lg:max-w-screen-lg lg:max-h-screen overflow-y-scroll">
          <JobDetails jobId={curJobId} />
        </DialogContent>
      </Dialog>
      <div className="text-xs text-muted-foreground">
        Showing{" "}
        <strong>
          {startPostIndex} to {endPostIndex}
        </strong>{" "}
        of
        <strong> {totalJobs}</strong> jobs
      </div>
      {totalJobs > jobsPerPage && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this job?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete and
              remove data from server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => deleteJob(jobIdToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MyJobsTable;
