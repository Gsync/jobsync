"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

            {matchData && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="summary">
                  <AccordionTrigger>Match Summary</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm">{matchData.summary}</p>
                    <Badge className="mt-2" variant="outline">
                      {matchData.recommendation}
                    </Badge>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="skills">
                  <AccordionTrigger>Skills Analysis</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {matchData.skills.matched.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-600">Matched Skills</h5>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {matchData.skills.matched.map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {matchData.skills.missing.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-amber-600">Missing Skills</h5>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {matchData.skills.missing.map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {matchData.skills.transferable.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-blue-600">Transferable Skills</h5>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {matchData.skills.transferable.map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="requirements">
                  <AccordionTrigger>Requirements Analysis</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {matchData.requirements.met.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-600">Met Requirements</h5>
                          <ul className="text-sm mt-1 space-y-1">
                            {matchData.requirements.met.map((req, i) => (
                              <li key={i}>
                                <span className="font-medium">{req.requirement}</span>:{" "}
                                <span className="text-muted-foreground">{req.evidence}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {matchData.requirements.missing.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-red-600">Missing Requirements</h5>
                          <ul className="text-sm mt-1 space-y-1">
                            {matchData.requirements.missing.map((req, i) => (
                              <li key={i}>
                                <span className="font-medium">{req.requirement}</span>{" "}
                                <Badge variant="outline" className="text-xs">{req.importance}</Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {matchData.tailoringTips.length > 0 && (
                  <AccordionItem value="tips">
                    <AccordionTrigger>Tailoring Tips</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-2">
                        {matchData.tailoringTips.map((tip, i) => (
                          <li key={i}>
                            <span className="font-medium">{tip.section}:</span>{" "}
                            {tip.action}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {matchData.dealBreakers.length > 0 && (
                  <AccordionItem value="dealbreakers">
                    <AccordionTrigger>Potential Deal Breakers</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm text-red-600 space-y-1">
                        {matchData.dealBreakers.map((db, i) => (
                          <li key={i}>{db}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}

            <p className="text-xs text-muted-foreground">
              Discovered on {format(new Date(job.discoveredAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
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
