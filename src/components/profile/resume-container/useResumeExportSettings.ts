"use client";
import { useExportSettings } from "@/components/pdf-export/useExportSettings";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  clampNumericField,
  PDF_FONT_LABELS,
  type PdfFont,
} from "@/models/pdfExport.model";
import {
  defaultResumeExportSettings,
  RESUME_LAYOUT_LABELS,
  RESUME_NUMERIC_FIELDS,
  RESUME_TEMPLATE_DEFAULTS,
  type ResumeExportSettings,
  type ResumeLayout,
} from "@/models/resumeExport.model";

const KEY = APP_CONSTANTS.RESUME_EXPORT_SETTINGS_STORAGE_KEY;

// Rebuilt from a spread of the template's defaults, so a stored object can
// only ever contribute values — never extra keys, and never a missing one.
export function coerceResumeExportSettings(
  stored: unknown,
): ResumeExportSettings {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return { ...defaultResumeExportSettings };
  }
  const raw = stored as Record<string, unknown>;

  // The template is read first: every other field falls back to that
  // template's own default rather than to Simple's.
  const template =
    typeof raw.template === "string" && raw.template in RESUME_LAYOUT_LABELS
      ? (raw.template as ResumeLayout)
      : defaultResumeExportSettings.template;
  const next = { ...RESUME_TEMPLATE_DEFAULTS[template] };

  if (typeof raw.font === "string" && raw.font in PDF_FONT_LABELS) {
    next.font = raw.font as PdfFont;
  }

  if (typeof raw.showPageNumbers === "boolean") {
    next.showPageNumbers = raw.showPageNumbers;
  }

  // Iterates the resume's own field list, never the merged spec table.
  // clampNumericField returns the passed fallback for anything that is not
  // a finite number, so a missing key needs no guard.
  for (const field of RESUME_NUMERIC_FIELDS) {
    next[field] = clampNumericField(
      field,
      raw[field],
      RESUME_TEMPLATE_DEFAULTS[template][field],
    );
  }

  return next;
}

// Reads on open, keeping the resume's own rule on top: picking a template
// re-seeds the rest, because each template's defaults are its own shipped
// literals and carrying the previous one's numbers across would silently
// restyle the template the user just chose. Page numbers are a preference,
// not a template literal, so they carry across. The letter has no template,
// so this rule stays here rather than moving into the shared hook.
export function useResumeExportSettings(open: boolean) {
  const { settings, setSettings, ready } = useExportSettings({
    storageKey: KEY,
    defaults: defaultResumeExportSettings,
    coerce: coerceResumeExportSettings,
    open,
  });

  const update = (next: ResumeExportSettings) =>
    setSettings(
      next.template === settings.template
        ? next
        : {
            ...RESUME_TEMPLATE_DEFAULTS[next.template],
            showPageNumbers: next.showPageNumbers,
          },
    );

  return {
    settings,
    setSettings: update,
    ready,
    reset: () => update({ ...RESUME_TEMPLATE_DEFAULTS[settings.template] }),
  };
}
