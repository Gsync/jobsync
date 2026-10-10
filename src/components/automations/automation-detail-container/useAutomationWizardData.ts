"use client";

import { useEffect, useState } from "react";
import { getAutomationsList } from "@/actions/automation.actions";
import { getResumeList } from "@/actions/profile.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import type { AutomationWithResume } from "@/models/automation.model";
import type { WizardResume } from "../automation-wizard/wizardConfig";

// Reference data the edit wizard needs: the user's resumes and the other
// automations it checks for duplicate configurations.
export function useAutomationWizardData() {
  const [resumes, setResumes] = useState<WizardResume[]>([]);
  const [allAutomations, setAllAutomations] = useState<AutomationWithResume[]>(
    [],
  );

  useEffect(() => {
    getResumeList(1, APP_CONSTANTS.RESUME_PICKER_LIMIT).then((result) => {
      if (result?.data) {
        setResumes(
          result.data.map(
            (r: {
              id: string;
              title: string;
              _count?: { ResumeSections?: number };
            }) => ({
              id: r.id,
              title: r.title,
              sectionCount: r._count?.ResumeSections ?? 0,
            }),
          ),
        );
      }
    });
    getAutomationsList().then((result) => {
      if (result?.data) setAllAutomations(result.data);
    });
  }, []);

  return { resumes, allAutomations };
}
