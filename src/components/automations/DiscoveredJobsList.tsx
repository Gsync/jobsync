"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { APP_CONSTANTS, DISCOVERY_STATUSES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { CircularScore } from "@/components/CircularScore";
import { getDiscoveryStatusBadgeColor } from "@/lib/badge-colors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  X,
  ExternalLink,
  Briefcase,
  Building2,
  MapPin,
  ListFilter,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { DiscoveredJob, DiscoveryStatus } from "@/models/automation.model";
import { getWorkplaceTypeLabel } from "@/models/job.model";
import {
  acceptDiscoveredJob,
  dismissDiscoveredJob,
  analyzeDiscoveredJob,
  clearDiscoveredJobs,
} from "@/actions/automation.actions";
import { RecordsCount } from "@/components/RecordsCount";

// A job is "un-analyzed" only when matchData explicitly marks it so (Greenhouse
// floor survivors). JSearch and legacy jobs have no flag but carry a real AI
// score, so they count as analyzed.
function isAnalyzed(job: DiscoveredJob): boolean {
  try {
    return JSON.parse(job.matchData ?? "{}").analyzed !== false;
  } catch {
    return true;
  }
}

// Lexical pre-rank as a percentage (weights sum to ~1, so raw × 100). Only
// Greenhouse jobs carry it; null for JSearch/legacy jobs.
function getPrerankPercent(job: DiscoveredJob): number | null {
  try {
    const raw = JSON.parse(job.matchData ?? "{}").prerankScore;
    return typeof raw === "number" ? Math.round(raw * 100) : null;
  } catch {
    return null;
  }
}

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
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearIncludeNew, setClearIncludeNew] = useState(false);
  const [clearing, setClearing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onBusyChange?.(loadingAction !== null);
  }, [loadingAction, onBusyChange]);

  // Infinite scroll: auto-load next page when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          jobs.length < totalJobs
        ) {
          onLoadMore();
        }
      },
      { threshold: APP_CONSTANTS.INTERSECTION_OBSERVER_THRESHOLD },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [jobs.length, totalJobs, loadingMore, onLoadMore]);

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

  const handleAnalyze = async (jobId: string) => {
    setLoadingAction(jobId);
    try {
      const result = await analyzeDiscoveredJob(jobId);
      if (result.success) {
        toast({
          title: "Match analyzed",
          description: "AI match score is ready.",
        });
        onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to analyze job",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = async (job: DiscoveredJob) => {
    setLoadingAction(job.id);
    try {
      const result = await acceptDiscoveredJob(job.id);
      if (result.success) {
        toast({
          title: "Job accepted",
          description: "The job has been added to your tracked jobs.",
        });
        onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to accept job",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDismiss = async (jobId: string) => {
    setLoadingAction(jobId);
    try {
      const result = await dismissDiscoveredJob(jobId);
      if (result.success) {
        toast({ title: "Job dismissed" });
        onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to dismiss job",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    const result = await clearDiscoveredJobs({
      automationId,
      includeNew: clearIncludeNew,
    });
    setClearing(false);
    setClearOpen(false);

    if (result.success) {
      toast({
        title: "Discovered jobs cleared",
        description: `Removed ${result.deleted ?? 0} job(s).`,
      });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

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

  const toggleStatusFilter = (status: DiscoveryStatus, checked: boolean) => {
    onStatusFilterChange(
      checked
        ? [...statusFilter, status]
        : statusFilter.filter((s) => s !== status),
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Discovered Jobs</CardTitle>
            {totalJobs > 0 && (
              <RecordsCount
                count={jobs.length}
                total={totalJobs}
                label="jobs"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dismissedCount + newCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClearIncludeNew(false);
                  setClearOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="h-4 w-4 mr-1.5" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DISCOVERY_STATUSES.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status.value}
                    checked={statusFilter.includes(status.value)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) =>
                      toggleStatusFilter(status.value, checked)
                    }
                  >
                    {status.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
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
                {sortedJobs.map((job) => {
                  const isLoading = loadingAction === job.id;
                  const analyzed = isAnalyzed(job);
                  const prerankPercent = getPrerankPercent(job);

                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium hover:underline cursor-pointer"
                            onClick={() => onViewDetails?.(job)}
                          >
                            {job.JobTitle.label}
                          </span>
                          {job.jobUrl && (
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {job.Company.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {job.Location?.label || "N/A"}
                          {job.workplaceType && (
                            <Badge variant="outline" className="text-xs">
                              {getWorkplaceTypeLabel(job.workplaceType, job.workplaceType)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {prerankPercent != null ? (
                          <span
                            className="font-mono text-sm text-muted-foreground"
                            title="Internal lexical relevance score (not an AI match)"
                          >
                            {prerankPercent}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {analyzed ? (
                          <CircularScore
                            score={job.matchScore}
                            size="sm"
                            animate={false}
                            className="mx-auto"
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAnalyze(job.id)}
                            disabled={isLoading || runInProgress}
                            title={
                              runInProgress
                                ? "A run is in progress. Wait until it completes."
                                : undefined
                            }
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                                Analyze
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={
                            DISCOVERY_STATUSES.find(
                              (s) => s.value === job.discoveryStatus,
                            )?.label ?? job.discoveryStatus
                          }
                          color={getDiscoveryStatusBadgeColor(
                            job.discoveryStatus,
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(job.discoveredAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.discoveryStatus === "new" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAccept(job)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDismiss(job.id)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear discovered jobs?</AlertDialogTitle>
            <AlertDialogDescription>
              Accepted jobs are always kept. This permanently deletes all
              dismissed jobs
              {clearIncludeNew && newCount > 0
                ? " and all unreviewed new jobs"
                : ""}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {newCount > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={clearIncludeNew}
                onChange={(e) => setClearIncludeNew(e.target.checked)}
              />
              Also delete {newCount} unreviewed new job(s)
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault();
                handleClear();
              }}
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
