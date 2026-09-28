"use client";

import { Button } from "@/components/ui/button";
import {
  DisclosureGroup,
  ROW,
  SelectRow,
  StepperRow,
} from "@/components/pdf-export/settings-rows";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  formatSettingValue,
  PDF_FONT_LABELS,
} from "@/models/pdfExport.model";
import {
  RESUME_LAYOUT_LABELS,
  type ResumeExportSettings,
  type ResumeNumericSetting,
} from "@/models/resumeExport.model";

type ExportSettingsPanelProps = {
  settings: ResumeExportSettings;
  onChange: (settings: ResumeExportSettings) => void;
  onReset?: () => void;
  isDefault?: boolean;
  // Hides the Footer group: a one-page resume prints no page number.
  singlePage?: boolean;
};

const ID_PREFIX = "resume-export";

export function ExportSettingsPanel({
  settings,
  onChange,
  onReset,
  isDefault,
  singlePage,
}: ExportSettingsPanelProps) {
  const setNumber = (field: ResumeNumericSetting) => (value: number) =>
    onChange({ ...settings, [field]: value });

  const typographySummary = [
    PDF_FONT_LABELS[settings.font],
    formatSettingValue("fontSize", settings.fontSize),
    `${formatSettingValue("lineHeight", settings.lineHeight)} line`,
  ].join(" • ");

  const layoutSummary = [
    `${settings.marginVertical} × ${settings.marginHorizontal} pt margins`,
    `${settings.sectionSpacing}/${settings.entrySpacing} pt spacing`,
  ].join(" • ");

  return (
    <div className="flex flex-col gap-4">
      {/* Template reshapes everything below it, so it never folds away. */}
      <div className="rounded-lg border bg-muted/40">
        <SelectRow
          id={`${ID_PREFIX}-template`}
          label="Template"
          value={settings.template}
          labels={RESUME_LAYOUT_LABELS}
          onSelect={(template) => onChange({ ...settings, template })}
        />
      </div>

      <DisclosureGroup title="Typography" summary={typographySummary}>
        <SelectRow
          id={`${ID_PREFIX}-font`}
          label="Font"
          value={settings.font}
          labels={PDF_FONT_LABELS}
          onSelect={(font) => onChange({ ...settings, font })}
        />
        <StepperRow
          idPrefix={ID_PREFIX}
          field="fontSize"
          value={settings.fontSize}
          onCommit={setNumber("fontSize")}
        />
        <StepperRow
          idPrefix={ID_PREFIX}
          field="lineHeight"
          value={settings.lineHeight}
          onCommit={setNumber("lineHeight")}
        />
      </DisclosureGroup>

      <DisclosureGroup title="Layout" summary={layoutSummary}>
        <StepperRow
          idPrefix={ID_PREFIX}
          field="marginVertical"
          value={settings.marginVertical}
          onCommit={setNumber("marginVertical")}
        />
        <StepperRow
          idPrefix={ID_PREFIX}
          field="marginHorizontal"
          value={settings.marginHorizontal}
          onCommit={setNumber("marginHorizontal")}
        />
        <StepperRow
          idPrefix={ID_PREFIX}
          field="sectionSpacing"
          value={settings.sectionSpacing}
          onCommit={setNumber("sectionSpacing")}
        />
        <StepperRow
          idPrefix={ID_PREFIX}
          field="entrySpacing"
          value={settings.entrySpacing}
          onCommit={setNumber("entrySpacing")}
        />
      </DisclosureGroup>

      {/* Its only option does nothing on a one-page resume. */}
      {!singlePage && (
        <DisclosureGroup
          title="Footer"
          summary={`Page numbers ${settings.showPageNumbers ? "on" : "off"}`}
        >
          <div className={ROW}>
            <Label
              htmlFor={`${ID_PREFIX}-showPageNumbers`}
              className="cursor-pointer font-normal"
            >
              Show page numbers
            </Label>
            <Switch
              id={`${ID_PREFIX}-showPageNumbers`}
              className="ml-auto"
              checked={settings.showPageNumbers}
              onCheckedChange={(showPageNumbers) =>
                onChange({ ...settings, showPageNumbers })
              }
            />
          </div>
        </DisclosureGroup>
      )}

      {onReset && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isDefault}
          >
            Reset to defaults
          </Button>
        </div>
      )}
    </div>
  );
}
