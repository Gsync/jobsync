"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Bot, Bug, Key, Palette } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { getErrorCount } from "@/lib/error-reporter";

export type SettingsSection =
  | "ai-provider"
  | "api-keys"
  | "appearance"
  | "developer"
  | "error-log";

const SETTINGS_SECTIONS: {
  id: SettingsSection;
  labelKey: TranslationKey;
  icon: typeof Bot;
}[] = [
  { id: "ai-provider", labelKey: "settings.sidebarAiProvider", icon: Bot },
  { id: "api-keys", labelKey: "settings.sidebarApiKeys", icon: Key },
  { id: "appearance", labelKey: "settings.sidebarAppearance", icon: Palette },
  { id: "developer", labelKey: "settings.sidebarDeveloper", icon: Bug },
  { id: "error-log", labelKey: "settings.sidebarErrorLog", icon: AlertTriangle },
];

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export default function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  const { t } = useTranslations();
  const [errorCount, setErrorCount] = useState(0);

  const refreshCount = useCallback(() => {
    setErrorCount(getErrorCount());
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 3000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return (
    <nav className="flex flex-col gap-1 w-48 shrink-0">
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <Button
            key={section.id}
            variant="ghost"
            className={cn(
              "justify-start gap-2 rounded-none border-l-2",
              isActive
                ? "border-l-primary bg-muted font-medium"
                : "border-l-transparent hover:border-l-muted-foreground/25",
            )}
            onClick={() => onSectionChange(section.id)}
          >
            <Icon className="h-4 w-4" />
            {t(section.labelKey)}
            {section.id === "error-log" && errorCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto h-5 min-w-5 px-1 text-[10px] justify-center"
              >
                {errorCount}
              </Badge>
            )}
          </Button>
        );
      })}
    </nav>
  );
}
