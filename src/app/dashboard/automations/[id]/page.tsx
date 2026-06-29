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
  Square,
} from "lucide-react";
import {
  getAutomationById,
  getDiscoveredJobs,
  getAutomationRuns,
  pauseAutomation,
  resumeAutomation,
  getDiscoveredJobById,
} from "@/actions/automation.actions";
import type {
  AutomationWithResume,
  AutomationRun,
  DiscoveredJob,
} from "@/models/automation.model";
import type { JobMatchData } from "@/models/ai.schemas";
import { DiscoveredJobsList } from "@/components/automations/DiscoveredJobsList";
import { DiscoveredJobDetail } from "@/components/automations/DiscoveredJobDetail";
import { RunHistoryList } from "@/components/automations/RunHistoryList";
import { LogsTab } from "@/components/automations/LogsTab";
import Loading from "@/components/Loading";

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
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [runNowLoading, setRunNowLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [selectedJobMatchData, setSelectedJobMatchData] =
    useState<JobMatchData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [automationResult, runsResult, jobsResult] = await Promise.all([
        getAutomationById(automationId),
        getAutomationRuns(automationId),
        getDiscoveredJobs({ automationId }),
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
      }

      if (jobsResult.success && jobsResult.data) {
        setJobs(jobsResult.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load automation details",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [automationId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshJobs = useCallback(async () => {
    const jobsResult = await getDiscoveredJobs({ automationId });
    if (jobsResult.success && jobsResult.data) {
      setJobs(jobsResult.data);
    }
  }, [automationId]);

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

  const handleRunNow = async () => {
    if (!automation) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunNowLoading(true);
    setRunKey((prev) => prev + 1);
    try {
      const response = await fetch(`/api/automations/${automation.id}/run`, {
        method: "POST",
        signal: controller.signal,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const statusMsg =
          data.run.status === "cancelled"
            ? "Run cancelled"
            : "Automation run complete";
        toast({
          title: statusMsg,
          description: `Saved ${data.run.jobsSaved} new jobs`,
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to run automation",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast({ title: "Run aborted" });
      } else {
        toast({
          title: "Error",
          description: "Failed to run automation",
          variant: "destructive",
        });
      }
    } finally {
      abortControllerRef.current = null;
      setRunNowLoading(false);
      loadData();
    }
  };

  const handleAbortRun = () => {
    abortControllerRef.current?.abort();
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
      <div className="container mx-auto py-6">
        <Loading />
      </div>
    );
  }

  if (!automation) {
    return null;
  }

  const resumeMissing = !automation.resume;
  const newJobsCount = jobs.filter((j) => j.discoveryStatus === "new").length;

  return (
    <div className="col-span-3 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/automations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{automation.name}</h1>
          {(automation.keywords || automation.location) && (
            <p className="text-muted-foreground">
              {[automation.keywords, automation.location]
                .filter(Boolean)
                .join(" in ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
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
          {runNowLoading ? (
            <Button variant="destructive" onClick={handleAbortRun}>
              <Square className="h-4 w-4 mr-2" />
              Abort Run
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleRunNow}
              disabled={resumeMissing || automation.status === "paused"}
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
              <Badge
                variant={
                  automation.status === "active" ? "default" : "secondary"
                }
                className="mt-1"
              >
                {automation.status}
              </Badge>
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
                {jobs.length} total
                {newJobsCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {newJobsCount} new
                  </Badge>
                )}
              </p>
            </div>
          </div>
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
          <LogsTab automationId={automationId} runKey={runKey} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-4">
          <DiscoveredJobsList
            jobs={jobs}
            automationId={automationId}
            onRefresh={loadData}
            onViewDetails={handleViewJobDetails}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <RunHistoryList runs={runs} onDelete={loadData} />
        </TabsContent>
      </Tabs>

      <DiscoveredJobDetail
        job={selectedJob}
        matchData={selectedJobMatchData}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={loadData}
      />
    </div>
  );
}
