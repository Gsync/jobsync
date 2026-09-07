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

  // A loop over addCompany cannot work: it reads `companies` from the render
  // closure, so N calls all build from the same stale array and append one.
  // Returns how many boards were dropped at the cap, for the caller's toast.
  const addManyCompanies = (boards: LeverCompany[]) => {
    const seen = new Set(companies.map((c) => c.token));
    const fresh = boards.filter((b) => !seen.has(b.token));
    const room = APP_CONSTANTS.ATS_MAX_COMPANIES - companies.length;
    const added = fresh.slice(0, Math.max(room, 0));
    if (added.length > 0) {
      onChange({ ...value, companies: [...companies, ...added] });
    }
    return fresh.length - added.length;
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
        onAddMany={addManyCompanies}
        onRemove={removeCompany}
      />
      <TargetingFields value={value} onChange={onChange} />
      <RunOptionsFields value={value} onChange={onChange} />
    </div>
  );
}
