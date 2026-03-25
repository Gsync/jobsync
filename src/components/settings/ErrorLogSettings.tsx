"use client";

import { useEffect, useState, useCallback } from "react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "../ui/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { getUserSettings, updateUserSettings } from "@/actions/userSettings.actions";
import { useTranslations } from "@/i18n";
import type { DeveloperSettings } from "@/models/userSettings.model";
import {
  getErrors,
  clearErrors,
  getErrorCount,
  type ErrorEntry,
} from "@/lib/error-reporter";

const defaultDeveloper: DeveloperSettings = {
  debugLogging: true,
  logCategories: {
    scheduler: true,
    runner: true,
    automationLogger: true,
  },
  errorReporting: process.env.NODE_ENV === "development",
};

function ErrorLogSettings() {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [errorReporting, setErrorReporting] = useState<boolean>(
    process.env.NODE_ENV === "development"
  );

  const refreshErrors = useCallback(() => {
    setErrors(getErrors());
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const result = await getUserSettings();
        if (result.success && (result.data as any)?.settings?.developer) {
          const developer = (result.data as any).settings.developer;
          setErrorReporting(
            developer.errorReporting ??
              (process.env.NODE_ENV === "development")
          );
        }
      } catch (error) {
        console.error("Error fetching developer settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
    refreshErrors();
  }, [refreshErrors]);

  // Periodically refresh the error list to pick up new errors
  useEffect(() => {
    const interval = setInterval(refreshErrors, 3000);
    return () => clearInterval(interval);
  }, [refreshErrors]);

  const handleToggleReporting = async (checked: boolean) => {
    setErrorReporting(checked);

    try {
      const currentResult = await getUserSettings();
      let currentDeveloper = defaultDeveloper;
      if (currentResult.success && (currentResult.data as any)?.settings?.developer) {
        currentDeveloper = {
          ...defaultDeveloper,
          ...(currentResult.data as any).settings.developer,
          logCategories: {
            ...defaultDeveloper.logCategories,
            ...(currentResult.data as any).settings.developer.logCategories,
          },
        };
      }

      const newSettings: DeveloperSettings = {
        ...currentDeveloper,
        errorReporting: checked,
      };

      const result = await updateUserSettings({ developer: newSettings });
      if (result.success) {
        toast({
          variant: "success",
          title: t("settings.saved"),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("settings.error"),
          description: t("settings.saveFailed"),
        });
        setErrorReporting(!checked);
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("settings.error"),
        description: t("settings.saveFailed"),
      });
      setErrorReporting(!checked);
    }
  };

  const handleClearAll = () => {
    clearErrors();
    refreshErrors();
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getSourceBadgeVariant = (
    source: ErrorEntry["source"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (source) {
      case "error-boundary":
        return "destructive";
      case "unhandled-rejection":
        return "default";
      case "console-error":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSourceLabel = (source: ErrorEntry["source"]): string => {
    switch (source) {
      case "error-boundary":
        return "Error Boundary";
      case "unhandled-rejection":
        return "Unhandled Rejection";
      case "console-error":
        return "Console Error";
      default:
        return source;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t("settings.errorLog")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.errorLogDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("settings.loadingSettings")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t("settings.errorLog")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.errorLogDesc")}
        </p>
      </div>

      <div className="space-y-4">
        {/* Error Reporting toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="error-reporting">
              {t("settings.errorReporting")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.errorReportingDesc")}
            </p>
          </div>
          <Switch
            id="error-reporting"
            checked={errorReporting}
            onCheckedChange={handleToggleReporting}
            aria-label={t("settings.errorReporting")}
          />
        </div>

        {/* Error list header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">
            {errors.length > 0
              ? `${errors.length} ${errors.length === 1 ? "error" : "errors"}`
              : ""}
          </h4>
          {errors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("settings.clearErrors")}
            </Button>
          )}
        </div>

        {/* Error entries */}
        {errors.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t("settings.errorLogEmpty")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {errors.map((entry) => {
              const isExpanded = expandedIds.has(entry.id);
              const hasStack = !!(entry.stack || entry.componentStack);

              return (
                <Collapsible
                  key={entry.id}
                  open={isExpanded}
                  onOpenChange={() => hasStack && toggleExpanded(entry.id)}
                >
                  <div className="rounded-lg border">
                    <CollapsibleTrigger asChild disabled={!hasStack}>
                      <button
                        className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                        type="button"
                      >
                        <div className="mt-0.5 shrink-0">
                          {hasStack ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium leading-snug truncate">
                            {entry.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {t("settings.errorTimestamp")}:{" "}
                              {formatTimestamp(entry.timestamp)}
                            </span>
                            <Badge
                              variant={getSourceBadgeVariant(entry.source)}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {getSourceLabel(entry.source)}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-3 py-2">
                        {entry.stack && (
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono max-h-48 overflow-auto">
                            {entry.stack}
                          </pre>
                        )}
                        {entry.componentStack && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Component Stack:
                            </p>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono max-h-32 overflow-auto">
                              {entry.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorLogSettings;
