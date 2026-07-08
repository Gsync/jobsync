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
  MoreVertical,
  Pencil,
  Sparkles,
  StickyNote,
  Tags,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AiJobMatchSection } from "../profile/AiJobMatchSection";
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
import { toast } from "../ui/use-toast";

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
  const [aiSectionOpen, setAiSectionOpen] = useState(false);
  const [currentMatchScore, setCurrentMatchScore] = useState(job.matchScore);
  const [currentMatchData, setCurrentMatchData] = useState(job.matchData);
  const [currentStatus, setCurrentStatus] = useState(job.Status);
  const [editJobTarget, setEditJobTarget] = useState<JobResponse | null>(
    null,
  );
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [noteOpenTrigger, setNoteOpenTrigger] = useState(0);
  const router = useRouter();
  const goBack = () => router.back();

  const parsedMatchData = useMemo(() => {
    if (!currentMatchData) return null;
    try {
      return JSON.parse(currentMatchData) as JobMatchData;
    } catch {
      return null;
    }
  }, [currentMatchData]);

  const handleMatchSaved = useCallback(
    (matchScore: number, matchData: string) => {
      setCurrentMatchScore(matchScore);
      setCurrentMatchData(matchData);
    },
    [],
  );
  const getAiJobMatch = async () => {
    setAiSectionOpen(true);
  };

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
  };

  const onDeleteJob = async () => {
    const { success, message } = await deleteJobById(job.id);
    if (success) {
      toast({
        variant: "success",
        description: `Job has been deleted successfully`,
      });
      router.push("/dashboard/myjobs");
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
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
            onClick={getAiJobMatch}
            // disabled={loading}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Match with AI
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
          <CardHeader className="flex-row justify-between relative">
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
              {currentMatchScore != null && (
                <div className="flex flex-col items-center gap-1">
                  <CircularScore score={currentMatchScore} size="md" />
                  <span className="text-xs text-muted-foreground">AI Match</span>
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
          <h3 className="ml-4">
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
            <span className="ml-2">
              {job?.appliedDate ? format(new Date(job?.appliedDate), "PP") : ""}
            </span>
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
          {job.createdVia && (
            <div className="my-1 ml-4">
              <Badge variant="outline" className="text-xs text-muted-foreground">
                via {job.createdVia}
              </Badge>
            </div>
          )}
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
      {
        <AiJobMatchSection
          jobId={job?.id}
          aISectionOpen={aiSectionOpen}
          triggerChange={setAiSectionOpen}
          onMatchSaved={handleMatchSaved}
        />
      }
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
    </>
  );
}

export default JobDetails;
