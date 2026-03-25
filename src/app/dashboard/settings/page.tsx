"use client";

import { useState } from "react";
import AiSettings from "@/components/settings/AiSettings";
import ApiKeySettings from "@/components/settings/ApiKeySettings";
import DeveloperSettings from "@/components/settings/DeveloperSettings";
import DisplaySettings from "@/components/settings/DisplaySettings";
import SettingsSidebar, { type SettingsSection } from "@/components/settings/SettingsSidebar";

function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("ai-provider");

  return (
    <div className="flex flex-col col-span-3">
      <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">
        Settings
      </h3>
      <div className="flex gap-6">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 min-w-0">
          {activeSection === "ai-provider" && <AiSettings />}
          {activeSection === "api-keys" && <ApiKeySettings />}
          {activeSection === "appearance" && <DisplaySettings />}
          {activeSection === "developer" && <DeveloperSettings />}
        </div>
      </div>
    </div>
  );
}

export default Settings;
