"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabQueryParam } from "@/hooks/useTabQueryParam";
import { Badge } from "@/components/ui/badge";
import { isRetiredBoard } from "@/models/automation.model";
import { DiscoveredJobsList } from "@/components/automations/DiscoveredJobsList";
import { DiscoveredJobDetail } from "@/components/automations/DiscoveredJobDetail";
import { RunHistoryList } from "@/components/automations/RunHistoryList";
import { LogsTab } from "@/components/automations/LogsTab";
import { AutomationWizard } from "@/components/automations/AutomationWizard";
import Loading from "@/components/Loading";
import { useAutomationDetailData } from "./automation-detail-container/useAutomationDetailData";
import { useAutomationLifecycle } from "./automation-detail-container/useAutomationLifecycle";
import { useAutomationRun } from "./automation-detail-container/useAutomationRun";
import { AutomationDetailHeader } from "./automation-detail-container/AutomationDetailHeader";
import { AutomationSummaryCard } from "./automation-detail-container/AutomationSummaryCard";
import { AutomationDetailDialogs } from "./automation-detail-container/AutomationDetailDialogs";
import { useAutomationWizardData } from "./automation-detail-container/useAutomationWizardData";
import { useDiscoveredJobDetail } from "./automation-detail-container/useDiscoveredJobDetail";

const AUTOMATION_DETAIL_TABS = ["logs", "jobs", "history"] as const;

interface AutomationDetailContainerProps {
  automationId: string;
}

export function AutomationDetailContainer({
  automationId,
}: AutomationDetailContainerProps) {
  const [activeTab, handleTabChange] = useTabQueryParam(
    AUTOMATION_DETAIL_TABS,
    "logs",
  );

  const {
    automation,
    runs,
    totalRuns,
    runsLoadingMore,
    jobs,
    totalJobs,
    jobsLoadingMore,
    jobStatusCounts,
    statusFilter,
    loading,
    loadData,
    refreshJobs,
    loadMoreJobs,
    loadMoreRuns,
    handleStatusFilterChange,
  } = useAutomationDetailData(automationId);

  const {
    actionLoading,
    handlePauseResume,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    isDeleting,
    handleDelete,
  } = useAutomationLifecycle(automation, loadData);

  const {
    logData,
    runNowLoading,
    aborting,
    abortConfirmOpen,
    setAbortConfirmOpen,
    handleRunNow,
    handleAbortRun,
    handleClearLogs,
  } = useAutomationRun({
    automationId,
    automation,
    latestRunId: runs[0]?.id ?? null,
    loadData,
    refreshJobs,
  });

  const {
    selectedJob,
    selectedJobMatchData,
    detailOpen,
    setDetailOpen,
    handleViewJobDetails,
  } = useDiscoveredJobDetail();

  const { resumes, allAutomations } = useAutomationWizardData();

  const [jobsBusy, setJobsBusy] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading />
      </div>
    );
  }

  if (!automation) {
    return null;
  }

  const resumeMissing = !automation.resume;
  const newJobsCount = jobStatusCounts.new;
  const retired = isRetiredBoard(automation.jobBoard);
  // The button must reflect the real run state, not just this page instance's
  // runNowLoading: after navigating away and back, runNowLoading resets but the
  // SSE reports the run is still live, so fall back to logData.isRunning.
  const runActive = runNowLoading || logData.isRunning;

  return (
    <div className="py-6 space-y-6">
      <AutomationDetailHeader
        automation={automation}
        retired={retired}
        resumeMissing={resumeMissing}
        runActive={runActive}
        aborting={aborting}
        actionLoading={actionLoading}
        jobsBusy={jobsBusy}
        onRefresh={() => loadData(true)}
        onEdit={() => setWizardOpen(true)}
        onDelete={() => setDeleteConfirmOpen(true)}
        onPauseResume={handlePauseResume}
        onAbort={() => setAbortConfirmOpen(true)}
        onRunNow={handleRunNow}
      />

      <AutomationSummaryCard
        automation={automation}
        retired={retired}
        resumeMissing={resumeMissing}
        isRunning={logData.isRunning}
        totalJobs={totalJobs}
        newJobsCount={newJobsCount}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="jobs">
            Discovered Jobs
            {newJobsCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {newJobsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-4">
          <LogsTab logData={logData} onClearLogs={handleClearLogs} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-4">
          <DiscoveredJobsList
            jobs={jobs}
            totalJobs={totalJobs}
            loadingMore={jobsLoadingMore}
            onLoadMore={loadMoreJobs}
            dismissedCount={jobStatusCounts.dismissed}
            newCount={jobStatusCounts.new}
            acceptedCount={jobStatusCounts.accepted}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            automationId={automationId}
            onRefresh={loadData}
            onViewDetails={handleViewJobDetails}
            runInProgress={runNowLoading}
            onBusyChange={setJobsBusy}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <RunHistoryList
            runs={runs}
            totalRuns={totalRuns}
            loadingMore={runsLoadingMore}
            onLoadMore={loadMoreRuns}
            onDelete={loadData}
          />
        </TabsContent>
      </Tabs>

      <DiscoveredJobDetail
        job={selectedJob}
        matchData={selectedJobMatchData}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={loadData}
      />

      <AutomationDetailDialogs
        abortConfirmOpen={abortConfirmOpen}
        onAbortConfirmOpenChange={setAbortConfirmOpen}
        onAbortRun={handleAbortRun}
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmOpenChange={setDeleteConfirmOpen}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />

      <AutomationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        resumes={resumes}
        automations={allAutomations}
        onSuccess={() => loadData()}
        editAutomation={automation}
      />
    </div>
  );
}
