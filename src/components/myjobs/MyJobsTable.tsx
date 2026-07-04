"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  ListCollapse,
  MoreVertical,
  Pencil,
  StickyNote,
  Tags,
  Trash,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { StatusBadge } from "../StatusBadge";
import { getJobStatusBadgeColor } from "@/lib/badge-colors";
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
import { Button } from "../ui/button";
import { useState } from "react";
import { JobResponse, JobStatus } from "@/models/job.model";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { CircularScore } from "@/components/CircularScore";

type MyJobsTableProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
};

function MyJobsTable({
  jobs,
  jobStatuses,
  deleteJob,
  editJob,
  onChangeJobStatus,
  onAddNote,
}: MyJobsTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");

  const router = useRouter();
  const viewJobDetails = (jobId: string) => {
    router.push(`/dashboard/myjobs/${jobId}`);
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
            <TableHead className="hidden md:table-cell">Match</TableHead>
            <TableHead className="hidden md:table-cell">Source</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job: JobResponse) => {
            return (
              <TableRow key={job.id}>
                <TableCell className="hidden sm:table-cell">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Company logo"
                    className="aspect-square rounded-md object-cover h-8 w-8"
                    src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell w-[120px] whitespace-nowrap">
                  {job.appliedDate ? format(job.appliedDate, "PP") : "N/A"}
                </TableCell>
                <TableCell
                  className="font-medium cursor-pointer max-w-[120px] md:max-w-[220px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Link href={`/dashboard/myjobs/${job?.id}`} className="block truncate">
                      {job.JobTitle?.label}
                    </Link>
                    {(job._count?.Notes ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0">
                        <StickyNote className="h-3 w-3 mr-0.5" />
                        {job._count!.Notes}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[100px] md:max-w-[160px]">
                  <span className="block truncate">{job.Company?.label}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap max-w-[120px]">
                  <span className="block truncate">{job.Location?.label}</span>
                </TableCell>
                <TableCell>
                  {job.discoveryStatus === "dismissed" ? (
                    <Badge
                      variant="outline"
                      className="w-[70px] justify-center text-muted-foreground"
                    >
                      Dismissed
                    </Badge>
                  ) : new Date() > job.dueDate && job.Status?.value === "draft" ? (
                    <StatusBadge
                      label="Expired"
                      color="amber"
                      className="w-[70px] justify-center"
                    />
                  ) : (
                    <StatusBadge
                      label={job.Status?.label ?? ""}
                      color={getJobStatusBadgeColor(job.Status?.value ?? "")}
                      className="w-[70px] justify-center"
                    />
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {job.matchScore != null ? (
                    <CircularScore score={job.matchScore} size="sm" animate={false} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
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
                        <MoreVertical className="h-4 w-4" />
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
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => onAddNote(job.id)}
                        >
                          <StickyNote className="mr-2 h-4 w-4" />
                          Add a Note
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
      <DeleteAlertDialog
        pageTitle="job"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteJob(jobIdToDelete)}
      />
    </>
  );
}

export default MyJobsTable;
