"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, Loader2 } from "lucide-react";
import type { DiscoveredJob, DiscoveryStatus } from "@/models/automation.model";
import { isAnalyzed } from "./discovered-jobs-list/matchData";
import { useDiscoveredJobActions } from "./discovered-jobs-list/useDiscoveredJobActions";
import { useJobsInfiniteScroll } from "./discovered-jobs-list/useJobsInfiniteScroll";
import { DiscoveredJobsHeader } from "./discovered-jobs-list/DiscoveredJobsHeader";
import { DiscoveredJobRow } from "./discovered-jobs-list/DiscoveredJobRow";
import { ClearJobsDialog } from "./discovered-jobs-list/ClearJobsDialog";

interface DiscoveredJobsListProps {
  jobs: DiscoveredJob[];
  // Total jobs for this automation across all pages (not just the loaded
  // ones), used to drive infinite scroll.
  totalJobs: number;
  loadingMore: boolean;
  onLoadMore: () => void;
  // Full per-status counts for the automation (not just the loaded page), so
  // the clear dialog matches what clearDiscoveredJobs actually deletes.
  dismissedCount: number;
  newCount: number;
  acceptedCount: number;
  statusFilter: DiscoveryStatus[];
  onStatusFilterChange: (filter: DiscoveryStatus[]) => void;
  automationId: string;
  onRefresh: () => void;
  onViewDetails?: (job: DiscoveredJob) => void;
  // True while an automation run is in flight. The Analyze button is blocked to avoid concurrent LLM calls.
  runInProgress?: boolean;
  // Reports whether a per-job LLM action is in flight so the parent can block
  // starting a new run while a single-job analysis is still processing.
  onBusyChange?: (busy: boolean) => void;
}

export function DiscoveredJobsList({
  jobs,
  totalJobs,
  loadingMore,
  onLoadMore,
  dismissedCount,
  newCount,
  acceptedCount,
  statusFilter,
  onStatusFilterChange,
  automationId,
  onRefresh,
  onViewDetails,
  runInProgress = false,
  onBusyChange,
}: DiscoveredJobsListProps) {
  const [clearOpen, setClearOpen] = useState(false);
  const [clearIncludeNew, setClearIncludeNew] = useState(false);

  const { loadingAction, handleAnalyze, handleAccept, handleDismiss } =
    useDiscoveredJobActions(onRefresh, onBusyChange);

  const sentinelRef = useJobsInfiniteScroll(
    jobs.length,
    totalJobs,
    loadingMore,
    onLoadMore,
  );

  // Analyzed-first, then by matchScore desc (un-analyzed sort by their lexical
  // matchScore value). The analyzed flag lives in matchData JSON, so sort in JS.
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aa = isAnalyzed(a);
      const ba = isAnalyzed(b);
      if (aa !== ba) return aa ? -1 : 1;
      return b.matchScore - a.matchScore;
    });
  }, [jobs]);

  const hasAnyJobs = dismissedCount + newCount + acceptedCount > 0;

  if (!hasAnyJobs) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No discovered jobs</h3>
          <p className="text-muted-foreground text-center mt-2">
            Jobs discovered by automations will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <DiscoveredJobsHeader
        loadedCount={jobs.length}
        totalJobs={totalJobs}
        showClear={dismissedCount + newCount > 0}
        onClear={() => {
          setClearIncludeNew(false);
          setClearOpen(true);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />
      <CardContent>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No jobs match this filter</h3>
            <p className="text-muted-foreground mt-2">
              Try selecting a different status above.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Pre-rank</TableHead>
                  <TableHead className="text-center">Match</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discovered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedJobs.map((job) => (
                  <DiscoveredJobRow
                    key={job.id}
                    job={job}
                    isLoading={loadingAction === job.id}
                    runInProgress={runInProgress}
                    onViewDetails={onViewDetails}
                    onAnalyze={handleAnalyze}
                    onAccept={handleAccept}
                    onDismiss={handleDismiss}
                  />
                ))}
              </TableBody>
            </Table>
            {jobs.length < totalJobs && (
              <div
                ref={sentinelRef}
                data-testid="jobs-load-more-sentinel"
                className="flex justify-center p-4"
              >
                {loadingMore && (
                  <Loader2
                    data-testid="jobs-load-more-spinner"
                    className="h-5 w-5 animate-spin text-blue-500"
                  />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <ClearJobsDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        includeNew={clearIncludeNew}
        onIncludeNewChange={setClearIncludeNew}
        newCount={newCount}
        automationId={automationId}
        onRefresh={onRefresh}
      />
    </Card>
  );
}
