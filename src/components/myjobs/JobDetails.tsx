"use client";
import {
  Company,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
} from "@/models/job.model";
import { TipTapContentViewer } from "../TipTapContentViewer";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTabQueryParam } from "@/hooks/useTabQueryParam";
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
import { NotesSection } from "./NotesSection";
import { useState, useMemo } from "react";
import { MatchDetails } from "../automations/MatchDetails";
import type { JobMatchData } from "@/models/ai.schemas";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { AddJob } from "./AddJob";
import { deleteJobById, updateJobStatus } from "@/actions/job.actions";
import { toastError, toastSuccess } from "@/lib/toast";
import { JobDetailsHeader } from "./job-details/JobDetailsHeader";
import { JobSummaryCard } from "./job-details/JobSummaryCard";
import { JobTabEmptyState } from "./job-details/JobTabEmptyState";
import { CoverLetterTab } from "./job-details/CoverLetterTab";
import { useAutoMatch } from "./job-details/useAutoMatch";

const JOB_DETAIL_TABS = ["description", "match", "letter", "notes"] as const;

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
  const [pendingChatMessage, setPendingChatMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(job.Status);
  const [editJobTarget, setEditJobTarget] = useState<JobResponse | null>(
    null,
  );
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [noteOpenTrigger, setNoteOpenTrigger] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const router = useRouter();
  const [activeTab, handleTabChange] = useTabQueryParam(
    JOB_DETAIL_TABS,
    "description",
  );
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

  const jobLabel = `${job.JobTitle?.label ?? "this job"}${
    job.Company?.label ? ` at ${job.Company.label}` : ""
  }`;

  // Panel first so a failed clear can never leave a button looking dead, and
  // the message is sent either way — a conversation that would not clear is no
  // reason to withhold it.
  const startChat = async (text: string) => {
    openChat();
    try {
      await clearChat();
    } catch {
      // Reported by the action itself; the message still goes out.
    }
    void sendMessage({ parts: [{ type: "text", text }] });
  };

  const requestChat = (text: string) => {
    if (approvalPending) {
      setPendingChatMessage(text);
      setShowClearChatConfirm(true);
      return;
    }
    void startChat(text);
  };

  const onMatch = () => requestChat(`Match my resume to ${jobLabel}`);
  const onCoverLetter = () =>
    requestChat(`Write a cover letter for ${jobLabel}`);

  useAutoMatch(onMatch);

  const coverLetterBlockedReason =
    job.descriptionCompleteness === "title-only"
      ? "Add a job description first"
      : undefined;

  const onEditJob = () => {
    setEditJobTarget({ ...job, Status: currentStatus });
  };

  const resetEditJob = () => setEditJobTarget(null);

  const onAddNote = () => {
    handleTabChange("notes");
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

  return (
    <>
      <div className="py-6 space-y-6">
        <JobDetailsHeader
          job={job}
          jobStatuses={jobStatuses}
          currentStatus={currentStatus}
          coverLetterBlockedReason={coverLetterBlockedReason}
          onBack={goBack}
          onMatch={onMatch}
          onCoverLetter={onCoverLetter}
          onEdit={onEditJob}
          onDelete={() => setDeleteAlertOpen(true)}
          onAddNote={onAddNote}
          onChangeStatus={onChangeStatus}
        />

        <JobSummaryCard
          job={job}
          currentStatus={currentStatus}
          matchData={parsedMatchData}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="match">AI Match</TabsTrigger>
            <TabsTrigger value="letter">Cover Letter</TabsTrigger>
            <TabsTrigger value="notes">
              Notes
              {notesCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4">
            <Card className="p-6">
              <TipTapContentViewer content={job?.description} />
            </Card>
          </TabsContent>
          <TabsContent value="match" className="mt-4">
            <Card className="p-6">
              {parsedMatchData ? (
                <MatchDetails matchData={parsedMatchData} />
              ) : (
                <JobTabEmptyState
                  icon={Sparkles}
                  title="No match analysis yet"
                  description="Run an AI match to see how your resume lines up with this posting, and where the gaps are."
                  actionLabel="Match with AI"
                  onAction={onMatch}
                />
              )}
            </Card>
          </TabsContent>
          <TabsContent value="letter" className="mt-4">
            <Card className="p-6">
              <CoverLetterTab
                letter={job.CoverLetter}
                blockedReason={coverLetterBlockedReason}
                onGenerate={onCoverLetter}
              />
            </Card>
          </TabsContent>
          {/* forceMount keeps ⋮ → Add a Note and the count badge working off-tab. */}
          <TabsContent
            value="notes"
            className="mt-4 data-[state=inactive]:hidden"
            forceMount
          >
            <Card className="p-6">
              <NotesSection
                jobId={job.id}
                openTrigger={noteOpenTrigger}
                onCountChange={setNotesCount}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
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
        redirectPath={`/dashboard/myjobs/${job.id}?tab=${activeTab}`}
      />
      <DeleteAlertDialog
        pageTitle="job"
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onDelete={onDeleteJob}
      />
      {/* CLEAR CHAT BEFORE AN AI ACTION CONFIRM */}
      <AlertDialog
        open={showClearChatConfirm}
        onOpenChange={setShowClearChatConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the assistant conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              A job is waiting for your approval in the assistant. Starting this
              clears the conversation, and that job will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void startChat(pendingChatMessage)}>
              Clear and continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default JobDetails;
