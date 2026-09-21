"use client";
import { useState } from "react";
import { Loader } from "lucide-react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import Loading from "../Loading";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";
import InterviewsTable from "./InterviewsTable";
import { InterviewFilters } from "./interviews-container/InterviewFilters";
import { InterviewViewTabs } from "./interviews-container/InterviewViewTabs";
import { useInterviewsList } from "./interviews-container/useInterviewsList";
import type {
  InterviewFilterOption,
  InterviewView,
} from "@/models/interview.model";
import type { JobStageTypeRef } from "@/models/jobStage.model";
import type { JobStatus } from "@/models/job.model";

export type InterviewsContainerProps = {
  rounds: InterviewFilterOption[];
  companies: InterviewFilterOption[];
  stageTypes: JobStageTypeRef[];
  jobStatuses: JobStatus[];
};

function InterviewsContainer({ rounds, companies }: InterviewsContainerProps) {
  const [view, setView] = useState<InterviewView>("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [stageTypeId, setStageTypeId] = useState<string | undefined>(undefined);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const list = useInterviewsList(view, searchTerm, stageTypeId, companyId);

  const filtered = !!searchTerm || !!stageTypeId || !!companyId;

  return (
    <Card x-chunk="dashboard-interviews-chunk-0">
      <ResponsiveCardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle>Interviews</CardTitle>
          {!list.initialLoading && list.total > 0 && (
            <RecordsCount
              count={list.interviews.length}
              total={list.total}
              label="interviews"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <InterviewViewTabs view={view} onViewChange={setView} />
          <InterviewFilters
            rounds={rounds}
            companies={companies}
            stageTypeId={stageTypeId}
            companyId={companyId}
            onRoundChange={setStageTypeId}
            onCompanyChange={setCompanyId}
          />
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search interviews..."
          />
        </div>
      </ResponsiveCardHeader>
      <CardContent>
        {list.initialLoading ? (
          <Loading />
        ) : list.interviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {filtered
              ? "No interviews match these filters."
              : view === "past"
                ? "No interviews behind you yet."
                : "No interviews yet. Add an interview stage on a job's Timeline tab and it appears here."}
          </p>
        ) : (
          <>
            <InterviewsTable
              interviews={list.interviews}
              expandedId={expandedId}
              onToggle={(id) =>
                setExpandedId((prev) => (prev === id ? null : id))
              }
            />
            {list.hasMore && (
              <div ref={list.sentinelRef} className="flex justify-center py-4">
                {list.loadingMore && (
                  <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default InterviewsContainer;
