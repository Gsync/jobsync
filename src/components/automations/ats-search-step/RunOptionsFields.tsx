"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { APP_CONSTANTS } from "@/lib/constants";
import type { AtsConfigValue } from "./types";

interface RunOptionsFieldsProps {
  value: AtsConfigValue;
  onChange: (next: AtsConfigValue) => void;
}

export function RunOptionsFields({ value, onChange }: RunOptionsFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>
          Jobs analyzed per run: {value.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN}
        </Label>
        <Slider
          min={1}
          max={APP_CONSTANTS.ATS_LISTING_CAP}
          step={1}
          value={[value.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN]}
          onValueChange={(next) => onChange({ ...value, topK: next[0] })}
        />
        <p className="text-sm text-muted-foreground">
          The number of listings that get full AI match analysis each run.
          Higher means more coverage but slower, costlier runs.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-1">
          <Label>Save additional relevant listings</Label>
          <p className="text-sm text-muted-foreground">
            When on, listings that are relevant but didn&apos;t make the top-K
            are also saved, lexically-ranked but not yet AI-scored. They can be
            analyzed on-demand later from the discovered jobs list.
          </p>
        </div>
        <Switch
          checked={value.saveUnanalyzed !== false}
          onCheckedChange={(checked) =>
            onChange({ ...value, saveUnanalyzed: checked })
          }
        />
      </div>
    </>
  );
}
