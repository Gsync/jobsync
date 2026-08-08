"use client";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { StatusBadge } from "../StatusBadge";
import { getJobStatusBadgeColor } from "@/lib/badge-colors";
import { formatUrl } from "@/lib/utils";
import {
  Company,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
  getWorkplaceTypeLabel,
} from "@/models/job.model";
import { TipTapContentViewer } from "../TipTapContentViewer";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  ArrowLeft,
  FileText,
  MoreVertical,
  Pencil,
  Sparkles,
  StickyNote,
  Tags,
  Trash,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
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
import { GenerateCoverLetterSection } from "./GenerateCoverLetterSection";
import { NotesSection } from "./NotesSection";
import { useState, useMemo, useCallback } from "react";
import { DownloadFileButton } from "../profile/DownloadFileButton";
import { MatchDetails } from "../automations/MatchDetails";
import type { JobMatchData } from "@/models/ai.schemas";
import { CircularScore } from "@/components/CircularScore";
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
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { AddJob } from "./AddJob";
import { deleteJobById, updateJobStatus } from "@/actions/job.actions";
import { toastError, toastSuccess } from "@/lib/toast";

type JobDetailsProps = {
  job: JobResponse;
  jobStatuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  tags: Tag[];
};

function JobDetails({
  job,
  jobStatuses,
  companies,
  titles,
  locations,
  sources,
  tags,
}: JobDetailsProps) {
  const {
    open: openChat,
    clear: clearChat,
    sendMessage,
    approvalPending,
  } = useAgentChat();
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(job.Status);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [currentCoverLetterId, setCurrentCoverLetterId] = useState(
    job.coverLetterId,
  );
  const [editJobTarget, setEditJobTarget] = useState<JobResponse | null>(
    null,
  );
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [noteOpenTrigger, setNoteOpenTrigger] = useState(0);
  const router = useRouter();
  const goBack = () => router.back();

  // Derived from the server prop, not local state: the chat saves the match
  // server-side and fires router.refresh(), so mirrored state would go stale.
  const parsedMatchData = useMemo(() => {
    if (!job.matchData) return null;
    try {
      return JSON.parse(job.matchData) as JobMatchData;
    } catch {
      return null;
    }
  }, [job.matchData]);

  // Panel first so a failed clear can never leave the button looking dead,
  // and the match is sent either way — a conversation that would not clear
  // is no reason to withhold it.
  const startMatch = async () => {
    openChat();
    try {
      await clearChat();
    } catch {
      // Reported by the action itself; the match still goes out.
    }
    const label = `${job.JobTitle?.label ?? "this job"}${
      job.Company?.label ? ` at ${job.Company.label}` : ""
    }`;
    void sendMessage({
      parts: [{ type: "text", text: `Match my resume to ${label}` }],
    });
  };

  const onMatchClick = () => {
    if (approvalPending) {
      setShowClearChatConfirm(true);
      return;
    }
    void startMatch();
  };

  const coverLetterBlockedReason =
    job.descriptionCompleteness === "title-only"
      ? "Add a job description first"
      : undefined;

  const handleCoverLetterSaved = useCallback((coverLetterId: string) => {
    setCurrentCoverLetterId(coverLetterId);
  }, []);

  const onEditJob = () => {
    setEditJobTarget({ ...job, Status: currentStatus });
  };

  const resetEditJob = () => setEditJobTarget(null);

  const onAddNote = () => {
    setNoteOpenTrigger((prev) => prev + 1);
  };

  const onChangeStatus = async (status: JobStatus) => {
    const { success, message } = await updateJobStatus(job.id, status);
    if (success) {
      setCurrentStatus(status);
      toastSuccess(`Job has been updated successfully`);
    } else {
      toastError(message);
    }
  };

  const onDeleteJob = async () => {
    const { success, message } = await deleteJobById(job.id);
    if (success) {
      toastSuccess(`Job has been deleted successfully`);
      router.push("/dashboard/myjobs");
    } else {
      toastError(message);
    }
  };

  const getJobType = (code: string) => {
    switch (code) {
      case "FT":
        return "Full-time";
      case "PT":
        return "Part-time";
      case "C":
        return "Contract";
      default:
        return "Unknown";
    }
  };

  return (
    <>
      <div className="flex justify-between">
        <Button title="Go Back" size="sm" variant="outline" onClick={goBack}>
          <ArrowLeft />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 cursor-pointer"
            onClick={onMatchClick}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Match with AI
            </span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 cursor-pointer"
            data-testid="generate-cover-letter-btn"
            disabled={!!coverLetterBlockedReason}
            title={coverLetterBlockedReason}
            onClick={() => setCoverLetterOpen(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              {currentCoverLetterId ? "Regenerate Letter" : "Cover Letter"}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-haspopup="true"
                size="icon"
                variant="ghost"
                data-testid="job-details-actions-menu-btn"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer" onClick={onEditJob}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Job
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={onAddNote}>
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
                          onSelect={() => onChangeStatus(status)}
                          disabled={status.id === currentStatus.id}
                        >
                          <span>{status.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => setDeleteAlertOpen(true)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {job?.id && (
        <Card className="col-span-3">
          <CardHeader className="flex-row items-center justify-between relative">
            <div>
              {job?.Company?.label}
              <CardTitle>{job?.JobTitle?.label}</CardTitle>
              <CardDescription>
                {job?.Location?.label && `${job.Location.label} - `}
                {getJobType(job?.jobType)}
                {job?.workplaceType && ` · ${getWorkplaceTypeLabel(job.workplaceType)}`}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={onEditJob}
                  data-testid="job-details-edit-btn"
                >
                  <Pencil className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => setDeleteAlertOpen(true)}
                  data-testid="job-details-delete-btn"
                >
                  <Trash2 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
              {job.matchScore != null && (
                <div className="flex flex-col items-center gap-1">
                  <CircularScore score={job.matchScore} size="md" />
                  {parsedMatchData?.recommendation ? (
                    <Badge variant="outline" className="capitalize">
                      {parsedMatchData.recommendation}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">AI Match</span>
                  )}
                </div>
              )}
              {job?.Resume && job?.Resume?.File && job.Resume?.File?.filePath
                ? DownloadFileButton(
                    job?.Resume?.File?.filePath,
                    job?.Resume?.title,
                    job?.Resume?.File?.fileName,
                  )
                : null}
            </div>
          </CardHeader>
          {job.jobUrl && (
            <div className="my-3 ml-4">
              <span className="font-semibold mr-2">Job URL:</span>
              <a
                href={formatUrl(job.jobUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {job.jobUrl}
              </a>
            </div>
          )}
          <h3 className="ml-4 flex flex-wrap items-center gap-2">
            {job.dueDate && new Date() > job.dueDate && currentStatus?.value === "draft" ? (
              <StatusBadge
                label="Expired"
                color="amber"
                className="w-[70px] justify-center"
              />
            ) : (
              <StatusBadge
                label={currentStatus?.label ?? ""}
                color={getJobStatusBadgeColor(currentStatus?.value ?? "")}
                className="w-[70px] justify-center"
              />
            )}
            {job?.appliedDate && (
              <span>{format(new Date(job.appliedDate), "PP")}</span>
            )}
            {job.createdVia && (
              <Badge className="gap-1 bg-violet-500 dark:bg-violet-400">
                <Sparkles className="h-3.5 w-3.5" />
                via {job.createdVia}
              </Badge>
            )}
          </h3>
          {job.tags && job.tags.length > 0 && (
            <div className="my-3 ml-4 flex flex-wrap gap-1">
              {job.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}
          <div className="my-4 ml-4">
            <TipTapContentViewer content={job?.description} />
          </div>
          {parsedMatchData && (
            <div className="mx-4 mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Match Analysis
              </h4>
              <MatchDetails matchData={parsedMatchData} />
            </div>
          )}
          <NotesSection jobId={job.id} openTrigger={noteOpenTrigger} />
          <CardFooter></CardFooter>
        </Card>
      )}
      <GenerateCoverLetterSection
        jobId={job?.id}
        jobResumeId={job.resumeId}
        open={coverLetterOpen}
        triggerChange={setCoverLetterOpen}
        onSaved={handleCoverLetterSaved}
      />
      <AddJob
        jobStatuses={jobStatuses}
        companies={companies}
        jobTitles={titles}
        locations={locations}
        jobSources={sources}
        tags={tags}
        editJob={editJobTarget}
        resetEditJob={resetEditJob}
        hideTrigger
        redirectPath={`/dashboard/myjobs/${job.id}`}
      />
      <DeleteAlertDialog
        pageTitle="job"
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onDelete={onDeleteJob}
      />
      {/* CLEAR CHAT BEFORE MATCH CONFIRM */}
      <AlertDialog
        open={showClearChatConfirm}
        onOpenChange={setShowClearChatConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the assistant conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              A job is waiting for your approval in the assistant. Starting a
              match clears the conversation, and that job will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void startMatch()}>
              Clear and match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default JobDetails;
