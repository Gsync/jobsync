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

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{t("automations.keywords")}:</span>{" "}
                    {automation.keywords}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{t("automations.locationLabel")}:</span>{" "}
                    {automation.location}
                  </span>
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
                    <span className="text-xs">
                      Next: {formatDateCompact(new Date(automation.nextRunAt), locale)}
                    </span>
                  )}
                  {automation.lastRunAt && (
                    <span className="text-xs">
                      Last: {formatDateCompact(new Date(automation.lastRunAt), locale)}
                    </span>
                  )}
                </div>
              </div>

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
