"use client";

import { useEffect, useState } from "react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { Check, Loader2 } from "lucide-react";
import { getUserSettings, updateUserSettings } from "@/actions/userSettings.actions";
import { syncEnvVariable } from "@/lib/env-sync";
import { useTranslations } from "@/i18n";
import type { DeveloperSettings as DeveloperSettingsType } from "@/models/userSettings.model";

const defaultDeveloper: DeveloperSettingsType = {
  debugLogging: true,
  logCategories: {
    scheduler: true,
    runner: true,
    automationLogger: true,
  },
};

function DeveloperSettings() {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<DeveloperSettingsType>(defaultDeveloper);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const result = await getUserSettings();
        if (result.success && (result.data as any)?.settings?.developer) {
          const developer = (result.data as any).settings.developer;
          setSettings({
            ...defaultDeveloper,
            ...developer,
            logCategories: {
              ...defaultDeveloper.logCategories,
              ...developer.logCategories,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching developer settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = async (update: Partial<DeveloperSettingsType>) => {
    const newSettings: DeveloperSettingsType = {
      ...settings,
      ...update,
      logCategories: {
        ...settings.logCategories,
        ...(update.logCategories ?? {}),
      },
    };
    setSettings(newSettings);

    try {
      const result = await updateUserSettings({ developer: newSettings });
      if (result.success) {
        // Sync allowedDevOrigins to .env so it takes effect at runtime
        if ("allowedDevOrigins" in update) {
          await syncEnvVariable(
            "ALLOWED_DEV_ORIGINS",
            newSettings.allowedDevOrigins || undefined
          );
        }
        toast({
          variant: "success",
          title: t("settings.saved"),
          description:
            "allowedDevOrigins" in update
              ? t("settings.allowedDevOriginsSavedHint")
              : undefined,
        });
      } else {
        toast({
          variant: "destructive",
          title: t("settings.error"),
          description: t("settings.saveFailed"),
        });
        setSettings(settings);
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("settings.error"),
        description: t("settings.saveFailed"),
      });
      setSettings(settings);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t("settings.developerSettings")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.developerSettingsDesc")}
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
        <h3 className="text-lg font-medium">{t("settings.developerSettings")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.developerSettingsDesc")}
        </p>
      </div>

      <div className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="debug-logging">{t("settings.debugLogging")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.debugLoggingDesc")}
            </p>
          </div>
          <Switch
            id="debug-logging"
            checked={settings.debugLogging}
            onCheckedChange={(checked) =>
              handleToggle({ debugLogging: checked })
            }
            aria-label={t("settings.debugLogging")}
          />
        </div>

        {/* Category toggles */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="scheduler-logs">{t("settings.schedulerLogs")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.schedulerLogsDesc")}
            </p>
          </div>
          <Switch
            id="scheduler-logs"
            checked={settings.logCategories.scheduler}
            disabled={!settings.debugLogging}
            onCheckedChange={(checked) =>
              handleToggle({
                logCategories: { ...settings.logCategories, scheduler: checked },
              })
            }
            aria-label={t("settings.schedulerLogs")}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="runner-logs">{t("settings.runnerLogs")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.runnerLogsDesc")}
            </p>
          </div>
          <Switch
            id="runner-logs"
            checked={settings.logCategories.runner}
            disabled={!settings.debugLogging}
            onCheckedChange={(checked) =>
              handleToggle({
                logCategories: { ...settings.logCategories, runner: checked },
              })
            }
            aria-label={t("settings.runnerLogs")}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="automation-logger-logs">{t("settings.automationLoggerLogs")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.automationLoggerLogsDesc")}
            </p>
          </div>
          <Switch
            id="automation-logger-logs"
            checked={settings.logCategories.automationLogger}
            disabled={!settings.debugLogging}
            onCheckedChange={(checked) =>
              handleToggle({
                logCategories: { ...settings.logCategories, automationLogger: checked },
              })
            }
            aria-label={t("settings.automationLoggerLogs")}
          />
        </div>
        {/* Allowed Dev Origins */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="space-y-0.5">
            <Label htmlFor="allowed-dev-origins">{t("settings.allowedDevOrigins")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.allowedDevOriginsDesc")}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              id="allowed-dev-origins"
              placeholder="http://192.168.1.100:3737, http://myhost.ts.net:3737"
              value={settings.allowedDevOrigins ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, allowedDevOrigins: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleToggle({ allowedDevOrigins: settings.allowedDevOrigins });
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() =>
                handleToggle({ allowedDevOrigins: settings.allowedDevOrigins })
              }
              aria-label={t("common.save")}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.allowedDevOriginsHint")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DeveloperSettings;
