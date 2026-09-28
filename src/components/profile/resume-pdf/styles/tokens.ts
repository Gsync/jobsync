import type { ResumeExportSettings } from "@/models/resumeExport.model";
import {
  styleTokens,
  type BaseStyleTokens,
} from "@/components/pdf-export/tokens";

// Certificate blocks sit at three quarters of an entry gap in both
// templates (6 against 8), so the ratio is identity at the default.
const CERT_SPACING_RATIO = 0.75;

// Both templates render on A4. The page-number footer anchors from the top
// because react-pdf drops an absolute render Text anchored by `bottom` once
// a lineHeight applies to it.
export const A4_HEIGHT = 841.89;

export type StyleTokens = BaseStyleTokens & {
  sectionSpacing: number;
  entrySpacing: number;
  certSpacing: number;
};

export function resumeStyleTokens(
  settings: ResumeExportSettings,
): StyleTokens {
  return {
    ...styleTokens(settings),
    sectionSpacing: settings.sectionSpacing,
    entrySpacing: settings.entrySpacing,
    certSpacing: Math.round(settings.entrySpacing * CERT_SPACING_RATIO),
  };
}
