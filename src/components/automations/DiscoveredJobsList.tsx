"use client";

import { useState, useMemo } from "react";
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
  Check,
  X,
  ExternalLink,
  Briefcase,
  Building2,
  MapPin,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { DiscoveredJob } from "@/models/automation.model";
import {
  acceptDiscoveredJob,
  dismissDiscoveredJob,
  analyzeDiscoveredJob,
} from "@/actions/automation.actions";

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

interface DiscoveredJobsListProps {
  jobs: DiscoveredJob[];
  onRefresh: () => void;
  onViewDetails?: (job: DiscoveredJob) => void;
}

export function DiscoveredJobsList({
  jobs,
  onRefresh,
  onViewDetails,
}: DiscoveredJobsListProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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
    const result = await analyzeDiscoveredJob(jobId);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: "Match analyzed", description: "AI match score is ready." });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleAccept = async (job: DiscoveredJob) => {
    setLoadingAction(job.id);
    // Un-analyzed listings are analyzed first so they reach the jobs board with
    // a real AI score, never the internal lexical number.
    if (!isAnalyzed(job)) {
      const analysis = await analyzeDiscoveredJob(job.id);
      if (!analysis.success) {
        setLoadingAction(null);
        toast({
          title: "Error",
          description: analysis.message,
          variant: "destructive",
        });
        return;
      }
    }
    const result = await acceptDiscoveredJob(job.id);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: "Job accepted", description: "The job has been added to your tracked jobs." });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleDismiss = async (jobId: string) => {
    setLoadingAction(jobId);
    const result = await dismissDiscoveredJob(jobId);
    setLoadingAction(null);

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
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 65) return "secondary";
    return "outline";
  };

  if (jobs.length === 0) {
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
      <CardHeader>
        <CardTitle>Discovered Jobs</CardTitle>
        <CardDescription>
          Jobs found by your automations that match your criteria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
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
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {analyzed ? (
                      <Badge variant={getScoreBadgeVariant(job.matchScore)}>
                        {job.matchScore}%
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAnalyze(job.id)}
                        disabled={isLoading}
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
                    <Badge
                      variant={
                        job.discoveryStatus === "accepted"
                          ? "default"
                          : job.discoveryStatus === "dismissed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {job.discoveryStatus}
                    </Badge>
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
      </CardContent>
    </Card>
  );
}
