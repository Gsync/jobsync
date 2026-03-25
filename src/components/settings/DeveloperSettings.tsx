"use client";

import { useEffect, useState } from "react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { toast } from "../ui/use-toast";
import { Loader2 } from "lucide-react";
import { getUserSettings, updateUserSettings } from "@/actions/userSettings.actions";
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
      </div>
    </div>
  );
}

export default DeveloperSettings;
