"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n";
import { formatDateShort } from "@/i18n";
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
} from "lucide-react";
import type { DiscoveredJob } from "@/models/automation.model";
import { acceptDiscoveredJob, dismissDiscoveredJob } from "@/actions/automation.actions";

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
  const { t, locale } = useTranslations();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAccept = async (jobId: string) => {
    setLoadingAction(jobId);
    const result = await acceptDiscoveredJob(jobId);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: t("automations.jobAccepted"), description: t("automations.jobAcceptedDesc") });
      onRefresh();
    } else {
      toast({
        title: t("automations.somethingWentWrong"),
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
      toast({ title: t("automations.jobDismissed") });
      onRefresh();
    } else {
      toast({
        title: t("automations.somethingWentWrong"),
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
          <h3 className="text-lg font-medium">{t("automations.noDiscoveredJobs")}</h3>
          <p className="text-muted-foreground text-center mt-2">
            {t("automations.noDiscoveredJobsDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("automations.discoveredJobs")}</CardTitle>
        <CardDescription>
          {t("automations.discoveredJobsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("automations.job")}</TableHead>
              <TableHead>{t("automations.company")}</TableHead>
              <TableHead>{t("automations.locationHeader")}</TableHead>
              <TableHead className="text-center">{t("automations.match")}</TableHead>
              <TableHead>{t("automations.status")}</TableHead>
              <TableHead>{t("automations.discovered")}</TableHead>
              <TableHead className="text-right">{t("automations.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const isLoading = loadingAction === job.id;

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
                    <Badge variant={getScoreBadgeVariant(job.matchScore)}>
                      {job.matchScore}%
                    </Badge>
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
                    {formatDateShort(new Date(job.discoveredAt), locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    {job.discoveryStatus === "new" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAccept(job.id)}
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
