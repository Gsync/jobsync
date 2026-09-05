"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { CircularScore } from "@/components/CircularScore";
import { getDiscoveryStatusBadgeColor } from "@/lib/badge-colors";
import { TableCell, TableRow } from "@/components/ui/table";
import { DISCOVERY_STATUSES } from "@/lib/constants";
import {
  Check,
  X,
  ExternalLink,
  Building2,
  MapPin,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { DiscoveredJob } from "@/models/automation.model";
import { getWorkplaceTypeLabel } from "@/models/job.model";
import { isAnalyzed, getPrerankPercent } from "./matchData";

interface DiscoveredJobRowProps {
  job: DiscoveredJob;
  isLoading: boolean;
  runInProgress: boolean;
  onViewDetails?: (job: DiscoveredJob) => void;
  onAnalyze: (jobId: string) => void;
  onAccept: (job: DiscoveredJob) => void;
  onDismiss: (jobId: string) => void;
}

export function DiscoveredJobRow({
  job,
  isLoading,
  runInProgress,
  onViewDetails,
  onAnalyze,
  onAccept,
  onDismiss,
}: DiscoveredJobRowProps) {
  const analyzed = isAnalyzed(job);
  const prerankPercent = getPrerankPercent(job);

  return (
    <TableRow>
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
            onClick={() => onAnalyze(job.id)}
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
            DISCOVERY_STATUSES.find((s) => s.value === job.discoveryStatus)
              ?.label ?? job.discoveryStatus
          }
          color={getDiscoveryStatusBadgeColor(job.discoveryStatus)}
        />
      </TableCell>
      <TableCell>{format(new Date(job.discoveredAt), "MMM d, yyyy")}</TableCell>
      <TableCell className="text-right">
        {job.discoveryStatus === "new" && (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAccept(job)}
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
              onClick={() => onDismiss(job.id)}
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
}
