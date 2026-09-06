"use client";

import { TriangleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getAllJobTitles, createJobTitle } from "@/actions/jobtitle.actions";
import { getAllTags, createTag } from "@/actions/tag.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { createLocation } from "@/actions/job.actions";
import { EntityStringChipInput } from "./EntityStringChipInput";
import type { AtsConfigValue } from "./types";

interface TargetingFieldsProps {
  value: AtsConfigValue;
  onChange: (next: AtsConfigValue) => void;
}

export function TargetingFields({ value, onChange }: TargetingFieldsProps) {
  // Without target titles or keywords there is no signal to rank jobs against,
  // so the relevance floor drops everything and nothing is saved.
  const noSignal =
    (value.targetTitles?.length ?? 0) === 0 &&
    (value.keywords?.length ?? 0) === 0;

  return (
    <>
      <EntityStringChipInput
        label="Target job titles"
        placeholder="e.g., Frontend Engineer"
        noun="job title"
        description="Optional. Listings whose title matches rank higher."
        values={value.targetTitles ?? []}
        onChange={(next) => onChange({ ...value, targetTitles: next })}
        loadOptions={async () => {
          const res = await getAllJobTitles();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createJobTitle(lbl);
          return res?.id ? res : null;
        }}
      />

      <EntityStringChipInput
        label="Keywords / skills"
        placeholder="e.g., React"
        noun="keyword"
        description="Optional. Matched against title and description."
        values={value.keywords ?? []}
        onChange={(next) => onChange({ ...value, keywords: next })}
        loadOptions={async () => {
          const res = await getAllTags();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createTag(lbl);
          return res?.success ? res.data : null;
        }}
      />

      {noSignal && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Add at least one target title or keyword. Without them there is
            nothing to rank jobs against, so this automation will save no
            listings.
          </span>
        </div>
      )}

      <EntityStringChipInput
        label="Locations"
        placeholder="e.g., Calgary, Seattle"
        noun="location"
        description="Optional. Used only to filter results when the toggle below is on (not part of ranking)."
        values={value.locations ?? []}
        onChange={(next) => onChange({ ...value, locations: next })}
        loadOptions={async () => {
          const res = await getAllJobLocations();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createLocation(lbl);
          return res?.success ? res.data : null;
        }}
      />

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-1">
          <Label>Only show jobs in these locations</Label>
          <p className="text-sm text-muted-foreground">
            When on, jobs matching none of your locations are dropped before
            ranking. Remote roles always pass.
          </p>
        </div>
        <Switch
          checked={!!value.strictLocation}
          disabled={(value.locations ?? []).length === 0}
          onCheckedChange={(checked) =>
            onChange({ ...value, strictLocation: checked })
          }
        />
      </div>
    </>
  );
}
