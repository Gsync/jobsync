"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n";
import { formatDateCompact } from "@/i18n";
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
} from "lucide-react";
import type { AutomationWithResume } from "@/models/automation.model";
import {
  deleteAutomation,
  pauseAutomation,
  resumeAutomation,
} from "@/actions/automation.actions";
import Link from "next/link";
import { getLocationLabel } from "@/lib/connector/job-discovery/modules/eures/countries";

interface AutomationListProps {
  automations: AutomationWithResume[];
  onEdit: (automation: AutomationWithResume) => void;
  onRefresh: () => void;
}

/** Resolve a comma-separated location string to readable labels */
function resolveLocations(location: string, jobBoard: string): string[] {
  if (!location) return [];
  const codes = location.split(",").map((c) => c.trim()).filter(Boolean);
  // Only resolve EURES / arbeitsagentur codes; for other boards, return as-is
  if (jobBoard === "eures" || jobBoard === "arbeitsagentur") {
    return codes.map((code) => getLocationLabel(code));
  }
  return codes;
}

export function AutomationList({
  automations,
  onEdit,
  onRefresh,
}: AutomationListProps) {
  const { t, locale } = useTranslations();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handlePause = async (id: string) => {
    setLoadingAction(id);
    const result = await pauseAutomation(id);
    setLoadingAction(null);

    if (result.success) {
      toast({ title: t("automations.automationPaused") });
      onRefresh();
    } else {
      toast({
        title: t("automations.validationError"),
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
      toast({ title: t("automations.automationResumed") });
      onRefresh();
    } else {
      toast({
        title: t("automations.validationError"),
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteAutomation(deleteId);
    setIsDeleting(false);
    setDeleteId(null);

    if (result.success) {
      toast({ title: t("automations.automationDeleted") });
      onRefresh();
    } else {
      toast({
        title: t("automations.validationError"),
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
          <h3 className="text-lg font-medium">{t("automations.noAutomations")}</h3>
          <p className="text-muted-foreground text-center mt-2">
            {t("automations.noAutomationsDesc")}
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
          const keywordChips = automation.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);
          const locationLabels = resolveLocations(automation.location, automation.jobBoard);

          return (
            <Link
              key={automation.id}
              href={`/dashboard/automations/${automation.id}`}
              className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between p-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">
                      {automation.name}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {automation.jobBoard}
                    </Badge>
                    <Badge
                      variant={automation.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {automation.status}
                    </Badge>
                  </div>

                  {resumeMissing && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t("automations.resumeMissing")}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground">{t("automations.keywords")}:</span>
                      {keywordChips.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground">{t("automations.locationLabel")}:</span>
                      {locationLabels.map((label, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                    {automation.resume && (
                      <span>
                        <span className="font-medium text-foreground">{t("automations.resumeLabel")}:</span>{" "}
                        {automation.resume.title}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {automation.scheduleHour.toString().padStart(2, "0")}:00 {t("automations.daily").toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{automation.matchThreshold}% {t("automations.threshold").toLowerCase()}</span>
                    </div>
                    {automation.nextRunAt && automation.status === "active" && (
                      <span className="text-sm">
                        {t("automations.nextRun")}: {formatDateCompact(new Date(automation.nextRunAt), locale)}
                      </span>
                    )}
                    {automation.lastRunAt && (
                      <span className="text-sm">
                        {t("automations.lastRun")}: {formatDateCompact(new Date(automation.lastRunAt), locale)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 actions (pause/resume + edit + delete) > 2, keep dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading}
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {automation.status === "active" ? (
                      <DropdownMenuItem onClick={() => handlePause(automation.id)}>
                        <Pause className="h-4 w-4 mr-2" />
                        {t("automations.pause")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleResume(automation.id)}
                        disabled={resumeMissing}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {t("automations.resume")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(automation)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("automations.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(automation.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("automations.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Link>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("automations.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("automations.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("automations.deleting") : t("automations.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
