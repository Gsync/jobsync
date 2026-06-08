"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/components/ui/use-toast";
import {
  MoreHorizontal,
  Pause,
  Play,
  Pencil,
  Trash2,
  Clock,
  FileText,
  AlertTriangle,
  Zap,
  Loader2,
} from "lucide-react";
import type { AutomationWithResume } from "@/models/automation.model";
import {
  deleteAutomation,
  pauseAutomation,
  resumeAutomation,
} from "@/actions/automation.actions";
import Link from "next/link";

interface AutomationListProps {
  automations: AutomationWithResume[];
  onEdit: (automation: AutomationWithResume) => void;
  onRefresh: () => void;
}

export function AutomationList({
  automations,
  onEdit,
  onRefresh,
}: AutomationListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handlePause = async (id: string) => {
    setLoadingAction(id);
    const result = await pauseAutomation(id);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: "Automation paused" });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleResume = async (id: string) => {
    setLoadingAction(id);
    const result = await resumeAutomation(id);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: "Automation resumed" });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/automations/${id}/run`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Run failed",
          description: data.message || "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      const { run } = data;
      if (run.status === "completed" || run.status === "completed_with_errors") {
        toast({
          title: run.jobsSaved > 0 ? `${run.jobsSaved} job${run.jobsSaved === 1 ? "" : "s"} saved` : "Run complete — no new matches",
          description: run.status === "completed_with_errors" ? "Some jobs could not be processed." : undefined,
        });
      } else {
        const errorMap: Record<string, string> = {
          "RAPIDAPI_KEY is not configured": "RapidAPI key missing — add it in Settings → API Keys.",
          "resume_missing": "No resume linked — edit the automation to select one.",
        };
        toast({
          title: "Run failed",
          description: errorMap[run.errorMessage ?? ""] ?? run.errorMessage ?? "Check the logs tab for details.",
          variant: "destructive",
        });
      }

      onRefresh();
    } catch {
      toast({ title: "Run failed", description: "Network error.", variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteAutomation(deleteId);
    setIsDeleting(false);
    setDeleteId(null);

    if (result.success) {
      toast({ title: "Automation deleted" });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  if (automations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No automations yet</h3>
          <p className="text-muted-foreground text-center mt-2">
            Create your first automation to start discovering jobs automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {automations.map((automation) => {
          const isLoading = loadingAction === automation.id;
          const resumeMissing = !automation.resume;

          return (
            <div
              key={automation.id}
              className="flex items-start justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/dashboard/automations/${automation.id}`}
                    className="font-semibold hover:underline"
                  >
                    {automation.name}
                  </Link>
                  <Badge variant="outline" className="capitalize">
                    {automation.jobBoard}
                  </Badge>
                  <Badge
                    variant={automation.status === "active" ? "default" : "secondary"}
                  >
                    {automation.status}
                  </Badge>
                </div>

                {resumeMissing && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Resume missing - select a new one</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">Keywords:</span>{" "}
                    {automation.keywords}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Location:</span>{" "}
                    {automation.location}
                  </span>
                  {automation.resume && (
                    <span>
                      <span className="font-medium text-foreground">Resume:</span>{" "}
                      {automation.resume.title}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {automation.scheduleHour.toString().padStart(2, "0")}:00 daily
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{automation.matchThreshold}% threshold</span>
                  </div>
                  {automation.nextRunAt && automation.status === "active" && (
                    <span className="text-xs">
                      Next: {format(new Date(automation.nextRunAt), "MMM d, h:mm a")}
                    </span>
                  )}
                  {automation.lastRunAt && (
                    <span className="text-xs">
                      Last: {format(new Date(automation.lastRunAt), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={automation.status !== "active" || runningId === automation.id}
                  onClick={() => handleRunNow(automation.id)}
                  title="Run now"
                >
                  {runningId === automation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isLoading}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {automation.status === "active" ? (
                    <DropdownMenuItem onClick={() => handlePause(automation.id)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleResume(automation.id)}
                      disabled={resumeMissing}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(automation)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteId(automation.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action cannot be
              undone. Discovered jobs will remain but lose their automation reference.
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
    </>
  );
}
