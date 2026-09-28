"use client";

import type { ReactNode } from "react";
import { FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PdfPreviewPane } from "./PdfPreviewPane";
import type { PreviewResult } from "./usePdfPreview";

type PdfExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  previewLabel: string;
  emptyMessage: string;
  blob: Blob | null;
  filename: string | null;
  isGenerating: boolean;
  /** An input the generator needs has not arrived yet. */
  isPending?: boolean;
  hasError: boolean;
  canExport: boolean;
  settingsPanel: ReactNode;
  onPageCountChange?: (count: number) => void;
  onExport: (prepared: PreviewResult | null) => void;
};

export function PdfExportDialog({
  open,
  onOpenChange,
  title,
  description,
  previewLabel,
  emptyMessage,
  blob,
  filename,
  isGenerating,
  isPending,
  hasError,
  canExport,
  settingsPanel,
  onPageCountChange,
  onExport,
}: PdfExportDialogProps) {
  // Exporting mid-generation would download the settings just switched away
  // from, since Export reuses the previewed blob. Exporting while pending
  // would take the null-prepared path and generate from inputs that have not
  // arrived — a letter with no letterhead, and no sign anything was wrong.
  const exportDisabled = !canExport || isGenerating || !!isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* A fixed height, not a max: the pane fits pages to its own height, so
          a content-driven one would feed back on itself. */}
      <DialogContent className="flex h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <div className="order-2 h-[45vh] min-h-0 md:order-1 md:h-auto md:min-w-0 md:flex-1">
            <PdfPreviewPane
              blob={blob}
              isGenerating={isGenerating || !!isPending}
              hasError={hasError}
              canExport={canExport}
              previewLabel={previewLabel}
              emptyMessage={emptyMessage}
              onPageCountChange={onPageCountChange}
              className="h-full"
            />
          </div>
          <div className="order-1 min-h-0 shrink-0 overflow-y-auto md:order-2 md:w-[34%]">
            {settingsPanel}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={exportDisabled}
            onClick={() => {
              // The blob on screen is the artifact; a null one tells the
              // caller to generate, which covers a failed preview.
              const prepared = blob && filename ? { blob, filename } : null;
              onOpenChange(false);
              onExport(prepared);
            }}
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
