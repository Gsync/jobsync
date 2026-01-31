"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import {
  Building2,
  MapPin,
  ExternalLink,
  Check,
  X,
  Loader2,
} from "lucide-react";
import type { DiscoveredJob } from "@/models/automation.model";
import type { JobMatchResponse } from "@/models/ai.schemas";
import { acceptDiscoveredJob, dismissDiscoveredJob } from "@/actions/automation.actions";
import { MatchDetails } from "./MatchDetails";

interface DiscoveredJobDetailProps {
  job: DiscoveredJob | null;
  matchData: JobMatchResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function DiscoveredJobDetail({
  job,
  matchData,
  open,
  onOpenChange,
  onRefresh,
}: DiscoveredJobDetailProps) {
  const [loadingAction, setLoadingAction] = useState<"accept" | "dismiss" | null>(null);

  if (!job) return null;

  const handleAccept = async () => {
    setLoadingAction("accept");
    const result = await acceptDiscoveredJob(job.id);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: "Job accepted", description: "The job has been added to your tracked jobs." });
      onOpenChange(false);
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleDismiss = async () => {
    setLoadingAction("dismiss");
    const result = await dismissDiscoveredJob(job.id);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: "Job dismissed" });
      onOpenChange(false);
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {job.JobTitle.label}
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
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {job.Company.label}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.Location?.label || "N/A"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="text-lg px-3 py-1">
                {job.matchScore}% Match
              </Badge>
              <Badge variant="outline">{job.discoveryStatus}</Badge>
              {job.automation && (
                <span className="text-sm text-muted-foreground">
                  from {job.automation.name}
                </span>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>

            <MatchDetails matchData={matchData} discoveredAt={job.discoveredAt} />
          </div>
        </ScrollArea>

        {job.discoveryStatus === "new" && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={loadingAction !== null}
            >
              {loadingAction === "dismiss" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Dismiss
            </Button>
            <Button onClick={handleAccept} disabled={loadingAction !== null}>
              {loadingAction === "accept" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accept
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
