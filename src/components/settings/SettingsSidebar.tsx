"use client";

import { Bot, Bug, Key, Palette } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n";
import type { TranslationKey } from "@/i18n";

export type SettingsSection = "ai-provider" | "api-keys" | "appearance" | "developer";

const SETTINGS_SECTIONS: {
  id: SettingsSection;
  labelKey: TranslationKey;
  icon: typeof Bot;
}[] = [
  { id: "ai-provider", labelKey: "settings.sidebarAiProvider", icon: Bot },
  { id: "api-keys", labelKey: "settings.sidebarApiKeys", icon: Key },
  { id: "appearance", labelKey: "settings.sidebarAppearance", icon: Palette },
  { id: "developer", labelKey: "settings.sidebarDeveloper", icon: Bug },
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
          </Button>
        );
      })}
    </nav>
  );
}
