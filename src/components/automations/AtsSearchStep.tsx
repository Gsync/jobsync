"use client";

import { APP_CONSTANTS } from "@/lib/constants";
import type { JobBoard, LeverCompany } from "@/models/automation.model";
import { CompanyPicker } from "./ats-search-step/CompanyPicker";
import { TargetingFields } from "./ats-search-step/TargetingFields";
import { RunOptionsFields } from "./ats-search-step/RunOptionsFields";
import type { AtsConfigValue } from "./ats-search-step/types";

export type { AtsConfigValue };

interface AtsSearchStepProps {
  provider: JobBoard;
  value: AtsConfigValue;
  onChange: (next: AtsConfigValue) => void;
}

export function AtsSearchStep({ provider, value, onChange }: AtsSearchStepProps) {
  const companies = value.companies ?? [];

  const addCompany = (company: LeverCompany) => {
    if (companies.some((c) => c.token === company.token)) return;
    if (companies.length >= APP_CONSTANTS.ATS_MAX_COMPANIES) return;
    onChange({ ...value, companies: [...companies, company] });
  };

  const removeCompany = (token: string) => {
    onChange({
      ...value,
      companies: companies.filter((c) => c.token !== token),
    });
  };

  return (
    <div className="space-y-5">
      <CompanyPicker
        provider={provider}
        companies={companies}
        onAdd={addCompany}
        onRemove={removeCompany}
      />
      <TargetingFields value={value} onChange={onChange} />
      <RunOptionsFields value={value} onChange={onChange} />
    </div>
  );
}
