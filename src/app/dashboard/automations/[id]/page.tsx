"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Pause,
  Play,
  RefreshCw,
  Loader2,
  Clock,
  FileText,
  AlertTriangle,
  PlayCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  getAutomationById,
  getAutomationsList,
  getDiscoveredJobs,
  getAutomationRuns,
  pauseAutomation,
  resumeAutomation,
  deleteAutomation,
  getDiscoveredJobById,
} from "@/actions/automation.actions";
import { getResumeList } from "@/actions/profile.actions";
import type {
  AutomationWithResume,
  AutomationRun,
  DiscoveredJob,
  DiscoveryStatus,
  JobBoard,
  LeverSourceConfig,
} from "@/models/automation.model";
import { isAtsBoard } from "@/models/automation.model";
import { companyBoardUrl } from "@/lib/atsBoardUrl";
import type { JobMatchData } from "@/models/ai.schemas";
import { DiscoveredJobsList } from "@/components/automations/DiscoveredJobsList";
import { DiscoveredJobDetail } from "@/components/automations/DiscoveredJobDetail";
import { RunHistoryList } from "@/components/automations/RunHistoryList";
import { LogsTab, type LogData } from "@/components/automations/LogsTab";
import { AutomationWizard } from "@/components/automations/AutomationWizard";
import Loading from "@/components/Loading";
import { APP_CONSTANTS } from "@/lib/constants";

// Pure JSON parse (no runner dependency — this is a client component, and
// runner.ts pulls the network-calling scraper into the client bundle). The raw
// parse may be missing any field, so it's a Partial of the config shape.
function parseAtsConfig(
  sourceConfig: string | null | undefined,
  jobBoard: JobBoard,
): Partial<LeverSourceConfig> | null {
  if (!sourceConfig) return null;
  try {
    return JSON.parse(sourceConfig)?.[jobBoard] ?? null;
  } catch {
    return null;
  }
}

export default function AutomationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const automationId = params.id as string;
  const activeTab = searchParams.get("tab") ?? "logs";

  const handleTabChange = (tab: string) => {
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  const [automation, setAutomation] = useState<AutomationWithResume | null>(
    null,
  );
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [runsPage, setRunsPage] = useState(1);
  const [totalRuns, setTotalRuns] = useState(0);
  const [runsLoadingMore, setRunsLoadingMore] = useState(false);
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [jobsLoadingMore, setJobsLoadingMore] = useState(false);
  const [jobStatusCounts, setJobStatusCounts] = useState<{
    new: number;
    dismissed: number;
    accepted: number;
  }>({ new: 0, dismissed: 0, accepted: 0 });
  const [statusFilter, setStatusFilter] = useState<DiscoveryStatus[]>([
    "new",
    "accepted",
  ]);
  // Mirrors statusFilter for loadData, which must not depend on statusFilter
  // directly (that would re-trigger its mount effect and flash the full-page
  // loading state whenever the filter changes).
  const statusFilterRef = useRef(statusFilter);
  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [runNowLoading, setRunNowLoading] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [abortConfirmOpen, setAbortConfirmOpen] = useState(false);
  const [jobsBusy, setJobsBusy] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [selectedJobMatchData, setSelectedJobMatchData] =
    useState<JobMatchData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [allAutomations, setAllAutomations] = useState<AutomationWithResume[]>(
    [],
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSearchConfig, setShowSearchConfig] = useState(false);
  // The latest run id at the moment a manual run is started, so the watcher can
  // tell the newly-created background run apart from the prior one.
  const prevLatestRunIdRef = useRef<string | null>(null);
  // Live run logs/status from the /logs SSE. Owned here (not in LogsTab) so the
  // connection survives tab switches and the "Running" status stays visible in
  // the header regardless of which tab is open.
  const [logData, setLogData] = useState<LogData>({
    logs: [],
    isRunning: false,
  });
  // Tracks whether the freshly-requested run has actually gone live on this
  // connection, so we don't latch onto the previous run's completed snapshot.
  const seenRunningRef = useRef(false);

  const fetchJobs = useCallback(
    (filter: DiscoveryStatus[], page = 1) =>
      getDiscoveredJobs({
        automationId,
        discoveryStatus: filter,
        page,
        limit: APP_CONSTANTS.RECORDS_PER_PAGE,
      }),
    [automationId],
  );

  const loadData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [automationResult, runsResult, jobsResult] = await Promise.all([
          getAutomationById(automationId),
          getAutomationRuns(automationId, {
            page: 1,
            limit: APP_CONSTANTS.RECORDS_PER_PAGE,
          }),
          fetchJobs(statusFilterRef.current),
        ]);

        if (automationResult.success && automationResult.data) {
          setAutomation(automationResult.data);
          setRuns(automationResult.data.runs || []);
        } else {
          toast({
            title: "Error",
            description: automationResult.message || "Automation not found",
            variant: "destructive",
          });
          router.push("/dashboard/automations");
          return;
        }

        if (runsResult.success && runsResult.data) {
          setRuns(runsResult.data);
          setTotalRuns(runsResult.total ?? 0);
          setRunsPage(1);
        }

        if (jobsResult.success && jobsResult.data) {
          setJobs(jobsResult.data);
          setTotalJobs(jobsResult.total ?? 0);
          setJobsPage(1);
          if (jobsResult.statusCounts) {
            setJobStatusCounts(jobsResult.statusCounts);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load automation details",
          variant: "destructive",
        });
      }
      if (showLoading) setLoading(false);
    },
    [automationId, router, fetchJobs],
  );

  useEffect(() => {
    // Only the initial load shows the full-page spinner. Background refreshes
    // (run watcher, pause/resume, deletes) must not unmount the page — doing so
    // remounts LogsTab while runKey is still > 0, which re-initializes its badge
    // to "Running" and then rejects the completed SSE snapshot.
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    getResumeList(1, 100, APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION).then(
      (result) => {
        if (result?.data) {
          setResumes(
            result.data.map((r: { id: string; title: string }) => ({
              id: r.id,
              title: r.title,
            })),
          );
        }
      },
    );
    getAutomationsList().then((result) => {
      if (result?.data) setAllAutomations(result.data);
    });
  }, []);

  // Subscribe to the live log/status stream at the page level so it persists
  // across tab switches. runKey bumps on Run Now to follow the new run.
  useEffect(() => {
    if (runKey > 0) {
      setLogData({ logs: [], isRunning: true });
      seenRunningRef.current = false;
    }

    const eventSource = new EventSource(
      `/api/automations/${automationId}/logs`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data: LogData = JSON.parse(event.data);
        if (data.isRunning) seenRunningRef.current = true;

        // Right after requesting a new run, the server may still be serving the
        // previous run's completed snapshot (or an empty store). Ignore those
        // until the new run goes live so we don't show stale logs or close early.
        if (runKey > 0 && !seenRunningRef.current && !data.isRunning) {
          return;
        }

        setLogData(data);
        // Close once the run is done so EventSource doesn't loop on reconnect.
        // On a fresh run (runKey>0) only close after it has gone live, so a
        // stale completed snapshot doesn't shut the stream before logs arrive.
        if (
          !data.isRunning &&
          data.completedAt &&
          (seenRunningRef.current || runKey === 0)
        ) {
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse log data:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [automationId, runKey]);

  // When a run is being followed only via the SSE (user navigated away and
  // back, so runNowLoading is false and the run watcher isn't polling), the
  // page won't otherwise refresh its tabs when the run ends. Detect the
  // live->done transition off the stream and reload then.
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (logData.isRunning) {
      wasRunningRef.current = true;
    } else if (wasRunningRef.current) {
      wasRunningRef.current = false;
      if (!runNowLoading) loadData();
    }
  }, [logData.isRunning, runNowLoading, loadData]);

  const handleClearLogs = useCallback(async () => {
    try {
      await fetch(`/api/automations/${automationId}/logs/clear`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to clear server logs:", err);
    }
    // Only empty the visible logs; keep isRunning/started/completed so the
    // "Running" badge survives and the live SSE keeps feeding new logs in.
    setLogData((prev) => ({ ...prev, logs: [] }));
  }, [automationId]);

  const refreshJobs = useCallback(async () => {
    const jobsResult = await fetchJobs(statusFilter);
    if (jobsResult.success && jobsResult.data) {
      setJobs(jobsResult.data);
      setTotalJobs(jobsResult.total ?? 0);
      setJobsPage(1);
      if (jobsResult.statusCounts) {
        setJobStatusCounts(jobsResult.statusCounts);
      }
    }
  }, [fetchJobs, statusFilter]);

  const loadMoreJobs = useCallback(async () => {
    setJobsLoadingMore(true);
    try {
      const nextPage = jobsPage + 1;
      const jobsResult = await fetchJobs(statusFilter, nextPage);
      if (jobsResult.success && jobsResult.data) {
        setJobs((prev) => [...prev, ...jobsResult.data!]);
        setTotalJobs(jobsResult.total ?? 0);
        setJobsPage(nextPage);
      }
    } finally {
      setJobsLoadingMore(false);
    }
  }, [fetchJobs, jobsPage, statusFilter]);

  const handleStatusFilterChange = useCallback(
    async (filter: DiscoveryStatus[]) => {
      setStatusFilter(filter);
      const jobsResult = await fetchJobs(filter);
      if (jobsResult.success && jobsResult.data) {
        setJobs(jobsResult.data);
        setTotalJobs(jobsResult.total ?? 0);
        setJobsPage(1);
        if (jobsResult.statusCounts) {
          setJobStatusCounts(jobsResult.statusCounts);
        }
      }
    },
    [fetchJobs],
  );

  const loadMoreRuns = useCallback(async () => {
    setRunsLoadingMore(true);
    try {
      const nextPage = runsPage + 1;
      const runsResult = await getAutomationRuns(automationId, {
        page: nextPage,
        limit: APP_CONSTANTS.RECORDS_PER_PAGE,
      });
      if (runsResult.success && runsResult.data) {
        setRuns((prev) => [...prev, ...runsResult.data!]);
        setTotalRuns(runsResult.total ?? 0);
        setRunsPage(nextPage);
      }
    } finally {
      setRunsLoadingMore(false);
    }
  }, [automationId, runsPage]);

  // While a manual run is in flight, jobs are persisted to the DB
  // incrementally (un-analyzed tier first, then each LLM-analyzed job).
  // Poll so they surface live instead of all at once when the run ends.
  useEffect(() => {
    if (!runNowLoading) return;
    const interval = setInterval(refreshJobs, 3000);
    return () => clearInterval(interval);
  }, [runNowLoading, refreshJobs]);

  const handlePauseResume = async () => {
    if (!automation) return;

    setActionLoading(true);
    const result =
      automation.status === "active"
        ? await pauseAutomation(automation.id)
        : await resumeAutomation(automation.id);
    setActionLoading(false);

    if (result.success) {
      toast({
        title:
          automation.status === "active"
            ? "Automation paused"
            : "Automation resumed",
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  // The run executes in the background on the server, so the /run request
  // returns immediately. Watch the run record until it reaches a terminal
  // status, then surface the outcome and refresh the tabs.
  useEffect(() => {
    if (!runNowLoading) return;
    let stopped = false;

    const poll = async () => {
      const res = await getAutomationRuns(automationId);
      if (stopped || !res.success || !res.data) return;
      const latest = res.data[0];
      // Wait for the new background run row to appear (different id from the run
      // that was latest when we started), so we don't read the prior run's
      // already-terminal status as this run's completion.
      if (!latest || latest.id === prevLatestRunIdRef.current) return;
      if (latest.status === "running" || latest.status === "cancelling") return;
      stopped = true;
      setRunNowLoading(false);
      setAborting(false);
      // Run is terminal; drop the live-follow signal so a later LogsTab remount
      // (e.g. switching tabs) doesn't re-init its badge to "Running".
      setRunKey(0);
      toast({
        title:
          latest.status === "cancelled"
            ? "Run cancelled"
            : "Automation run complete",
        description: `Saved ${latest.jobsSaved} new jobs`,
      });
      loadData();
    };

    const interval = setInterval(poll, 2000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [runNowLoading, automationId, loadData]);

  const handleRunNow = async () => {
    if (!automation) return;

    prevLatestRunIdRef.current = runs[0]?.id ?? null;
    setRunNowLoading(true);
    setAborting(false);
    // Signal the Logs tab to reconnect and follow this new run. The server's
    // startRun replaces the in-memory store, and LogsTab ignores the prior
    // run's completed snapshot until this run goes live.
    setRunKey((prev) => prev + 1);

    try {
      const response = await fetch(`/api/automations/${automation.id}/run`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setRunNowLoading(false);
        // 409 means a run IS genuinely active elsewhere (another tab, the
        // scheduler) — leave the optimistic running state alone so it keeps
        // following that real run's live SSE snapshot instead of flipping
        // the Abort Run button back to Run Now while a run is in progress.
        if (response.status !== 409) {
          // The run never went live, so the SSE stream will never report
          // isRunning:false for this runKey (it only accepts that snapshot
          // after first seeing a running one) — reset directly or the
          // Abort Run button spins forever.
          setRunKey(0);
          setLogData((prev) => ({ ...prev, isRunning: false }));
        }
        toast({
          title: "Error",
          description: data.message || "Failed to start run",
          variant: "destructive",
        });
      }
      // On success the run is running in the background; the watcher effect
      // above handles completion.
    } catch {
      setRunNowLoading(false);
      setRunKey(0);
      setLogData((prev) => ({ ...prev, isRunning: false }));
      toast({
        title: "Error",
        description: "Failed to start run",
        variant: "destructive",
      });
    }
  };

  const handleAbortRun = async () => {
    if (!automation) return;
    setAbortConfirmOpen(false);
    setAborting(true);
    // Flag the run in the DB; the background runner polls this flag, aborts the
    // in-flight LLM call, and finalizes the run as cancelled. The watcher effect
    // detects the terminal status.
    await fetch(`/api/automations/${automation.id}/cancel`, {
      method: "POST",
    }).catch(() => {});
  };

  const handleDelete = async () => {
    if (!automation) return;
    setIsDeleting(true);
    const result = await deleteAutomation(automation.id);
    setIsDeleting(false);
    setDeleteConfirmOpen(false);

    if (result.success) {
      toast({ title: "Automation deleted" });
      router.push("/dashboard/automations");
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleViewJobDetails = async (job: DiscoveredJob) => {
    const result = await getDiscoveredJobById(job.id);
    if (result.success && result.data) {
      setSelectedJob(result.data);
      setSelectedJobMatchData(
        result.data.parsedMatchData as JobMatchData | null,
      );
      setDetailOpen(true);
    } else {
      setSelectedJob(job);
      setSelectedJobMatchData(null);
      setDetailOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="col-span-3 flex items-center justify-center min-h-[60vh]">
        <Loading />
      </div>
    );
  }

  if (!automation) {
    return null;
  }

  const resumeMissing = !automation.resume;
  const newJobsCount = jobStatusCounts.new;
  const greenhouseConfig = isAtsBoard(automation.jobBoard)
    ? parseAtsConfig(automation.sourceConfig, automation.jobBoard)
    : null;
  // The button must reflect the real run state, not just this page instance's
  // runNowLoading: after navigating away and back, runNowLoading resets but the
  // SSE reports the run is still live, so fall back to logData.isRunning.
  const runActive = runNowLoading || logData.isRunning;

  return (
    <div className="col-span-3 py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/automations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{automation.name}</h1>
            {(automation.keywords || automation.location) && (
              <p className="text-muted-foreground">
                {[automation.keywords, automation.location]
                  .filter(Boolean)
                  .join(" in ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => loadData(true)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWizardOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            variant="outline"
            onClick={handlePauseResume}
            disabled={actionLoading || resumeMissing}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : automation.status === "active" ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {automation.status === "active" ? "Pause" : "Resume"}
          </Button>
          {runActive ? (
            <Button
              variant="destructive"
              onClick={() => setAbortConfirmOpen(true)}
              disabled={aborting}
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {aborting ? "Aborting…" : "Abort Run"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleRunNow}
              disabled={
                resumeMissing || automation.status === "paused" || jobsBusy
              }
              title={
                jobsBusy
                  ? "Wait for the in-progress job analysis to finish"
                  : undefined
              }
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    automation.status === "active" ? "default" : "secondary"
                  }
                >
                  {automation.status}
                </Badge>
                {logData.isRunning && (
                  <Badge variant="default" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Job Board</p>
              <p className="font-medium capitalize">{automation.jobBoard}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Match Threshold</p>
              <p className="font-medium">{automation.matchThreshold}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Schedule</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {automation.scheduleHour.toString().padStart(2, "0")}:00 daily
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resume</p>
              {resumeMissing ? (
                <p className="text-amber-600 flex items-center gap-1 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Missing
                </p>
              ) : (
                <Link
                  href={`/dashboard/profile/resume/${automation.resume.id}`}
                  className="font-medium flex items-center gap-1 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {automation.resume.title}
                </Link>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Run</p>
              <p className="font-medium">
                {automation.nextRunAt && automation.status === "active"
                  ? format(new Date(automation.nextRunAt), "MMM d, h:mm a")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Run</p>
              <p className="font-medium">
                {automation.lastRunAt
                  ? format(new Date(automation.lastRunAt), "MMM d, h:mm a")
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discovered Jobs</p>
              <p className="font-medium">
                {totalJobs} total
                {newJobsCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {newJobsCount} new
                  </Badge>
                )}
              </p>
            </div>
          </div>

          {greenhouseConfig && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 -ml-2 text-muted-foreground"
                onClick={() => setShowSearchConfig((prev) => !prev)}
              >
                {showSearchConfig ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                {showSearchConfig ? "Show less" : "Show more"}
              </Button>

              {showSearchConfig && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-4">
                    <p className="text-sm text-muted-foreground">Companies</p>
                    {greenhouseConfig.companies?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {greenhouseConfig.companies.map((c) => (
                          <Badge
                            key={c.token}
                            variant="secondary"
                            className="gap-1"
                          >
                            {c.name}
                            <a
                              href={companyBoardUrl(automation.jobBoard, c)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${c.name} job board`}
                              title="Open job board"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Target titles
                    </p>
                    <p className="font-medium">
                      {greenhouseConfig.targetTitles?.length
                        ? greenhouseConfig.targetTitles.join(", ")
                        : "Any"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Keywords</p>
                    <p className="font-medium">
                      {greenhouseConfig.keywords?.length
                        ? greenhouseConfig.keywords.join(", ")
                        : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Locations</p>
                    <p className="font-medium">
                      {greenhouseConfig.locations?.length
                        ? `${greenhouseConfig.locations.join(", ")}${
                            greenhouseConfig.strictLocation ? " (strict)" : ""
                          }`
                        : "Any location"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Jobs analyzed per run
                    </p>
                    <p className="font-medium">
                      {greenhouseConfig.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Extra listings
                    </p>
                    <p className="font-medium">
                      {greenhouseConfig.saveUnanalyzed !== false
                        ? "Saved"
                        : "Not saved"}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      <AlertDialog open={abortConfirmOpen} onOpenChange={setAbortConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abort this run?</AlertDialogTitle>
            <AlertDialogDescription>
              The run will stop after the current step. Jobs already discovered
              are kept; remaining jobs won&apos;t be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={(e) => {
                e.preventDefault();
                handleAbortRun();
              }}
            >
              Abort run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action
              cannot be undone. Discovered jobs will remain but lose their
              automation reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
