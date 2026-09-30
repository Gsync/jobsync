"use client";

import { BarChart3, Bot, Database, Key, Palette, Plug } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export type SettingsSection = "ai-provider" | "ai-usage" | "api-keys" | "appearance" | "mcp-access" | "data";

const SETTINGS_SECTIONS: {
  id: SettingsSection;
  label: string;
  icon: typeof Bot;
}[] = [
  { id: "ai-provider", label: "AI Provider", icon: Bot },
  { id: "ai-usage", label: "AI Usage", icon: BarChart3 },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "mcp-access", label: "MCP Access", icon: Plug },
  { id: "data", label: "Data", icon: Database },
];

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export default function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-10 sm:w-48 shrink-0">
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <Button
            key={section.id}
            variant="ghost"
            title={section.label}
            aria-label={section.label}
            className={cn(
              "justify-center sm:justify-start gap-2 rounded-none border-l-2 px-0 sm:px-4",
              isActive
                ? "border-l-primary bg-muted font-medium"
                : "border-l-transparent hover:border-l-muted-foreground/25",
            )}
            onClick={() => onSectionChange(section.id)}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{section.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
