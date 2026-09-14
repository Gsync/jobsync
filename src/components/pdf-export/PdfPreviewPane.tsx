"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { APP_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";

const PREVIEW_RESIZE_DEBOUNCE_MS = 250;
const MAX_CANVAS_SCALE = 2;

type FitMode = "page" | "width";

type PdfPreviewPaneProps = {
  blob: Blob | null;
  isGenerating: boolean;
  hasError: boolean;
  canExport: boolean;
  /** Names the scroll region, e.g. "Resume preview". */
  previewLabel: string;
  /** Shown when canExport is false. */
  emptyMessage: string;
  className?: string;
};

// pdf.js rejects a cancelled render; that is normal here, not a failure.
function isRenderCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "RenderingCancelledException"
  );
}

function pageLabel(count: number): string {
  return `${count} ${count === 1 ? "page" : "pages"}`;
}

export function PdfPreviewPane({
  blob,
  isGenerating,
  hasError,
  canExport,
  previewLabel,
  emptyMessage,
  className,
}: PdfPreviewPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  // What the observer last saw, against what was last committed to state.
  const measuredRef = useRef({ width: 0, height: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pageCount, setPageCount] = useState(0);
  const [renderFailed, setRenderFailed] = useState(false);
  const [fitMode, setFitMode] = useState<FitMode>("page");

  // Read after mount: localStorage is unavailable during SSR, so seeding the
  // initial state from it would cause a hydration mismatch.
  useEffect(() => {
    let saved: unknown = null;
    try {
      saved = getFromLocalStorage(
        APP_CONSTANTS.RESUME_PREVIEW_FIT_STORAGE_KEY,
        null,
      );
    } catch {
      // getFromLocalStorage calls JSON.parse unguarded; a corrupt value
      // would otherwise throw out of this effect and kill the dialog.
    }
    if (saved === "page" || saved === "width") setFitMode(saved);
  }, []);

  const onChangeFitMode = (mode: FitMode) => {
    setFitMode(mode);
    saveToLocalStorage(APP_CONSTANTS.RESUME_PREVIEW_FIT_STORAGE_KEY, mode);
  };

  useEffect(() => {
    const measure = measureRef.current;
    const scroll = scrollRef.current;
    if (!measure || !scroll) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Width caps the page; the scroll box's height is what decides whether a
    // whole page fits, so both are measured.
    const observer = new ResizeObserver((entries) => {
      const next = { ...measuredRef.current };
      for (const entry of entries) {
        if (entry.target === measure) {
          next.width = Math.floor(entry.contentRect.width);
        } else {
          next.height = Math.floor(entry.contentRect.height);
        }
      }
      // Recorded before the zero-guard: the two targets can report in
      // separate callbacks, and bailing early would drop the good half.
      measuredRef.current = next;
      const { width, height } = next;
      if (width <= 0 || height <= 0) return;
      if (width === sizeRef.current.width && height === sizeRef.current.height) {
        return;
      }
      const commit = () => {
        sizeRef.current = { width, height };
        setSize({ width, height });
      };
      // First measurement lands at once; later changes share the 250ms debounce.
      if (sizeRef.current.width === 0) {
        commit();
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(commit, PREVIEW_RESIZE_DEBOUNCE_MS);
    });

    observer.observe(measure);
    observer.observe(scroll);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const { width, height } = size;
    if (!blob || width <= 0 || height <= 0) return;

    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    let document_: { destroy?: () => Promise<void> } | null = null;

    // A stale failure must not suppress this attempt's spinner.
    setRenderFailed(false);

    const draw = async () => {
      try {
        const { getDocumentProxy } = await import("unpdf");
        // A fresh copy each load: pdf.js neuters the array it is handed.
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (cancelled) return;

        const pdf = await getDocumentProxy(bytes);
        if (cancelled) {
          void (pdf as { destroy?: () => Promise<void> }).destroy?.()?.catch(() => {});
          return;
        }
        document_ = pdf;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_SCALE);
        const canvases: HTMLCanvasElement[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;

          const unscaled = page.getViewport({ scale: 1 });
          // Fit page also bounds by height, so a page is whole rather than
          // cropped; fit width ignores height and lets the pane scroll.
          const fitted =
            fitMode === "width"
              ? width
              : Math.min(
                  width,
                  Math.floor(height * (unscaled.width / unscaled.height)),
                );
          const viewport = page.getViewport({
            scale: (fitted / unscaled.width) * dpr,
          });

          // Detached canvases: the mounted set is swapped only once the whole
          // document is drawn, so the pane never blanks mid-render.
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${fitted}px`;
          canvas.className = "block h-auto bg-white shadow-sm";

          const task = page.render({ canvas, viewport });
          renderTask = task;
          await task.promise;
          renderTask = null;
          if (cancelled) return;

          canvases.push(canvas);
        }

        const host = pagesRef.current;
        if (!host || cancelled) return;
        host.replaceChildren(...canvases);
        setPageCount(canvases.length);
        setRenderFailed(false);
        // Page breaks move between settings, so a kept offset lands nowhere.
        scrollRef.current?.scrollTo({ top: 0 });
      } catch (error) {
        if (cancelled || isRenderCancelled(error)) return;
        setRenderFailed(true);
      }
    };

    void draw();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      // destroy() rejects any page work still in flight; that is the point of
      // the call, so the rejection is swallowed rather than left floating.
      void document_?.destroy?.()?.catch(() => {});
    };
  }, [blob, size, fitMode]);

  const hasPages = pageCount > 0;
  const showEmpty = !canExport;
  const showError = canExport && (hasError || renderFailed);
  const showFirstSpinner = canExport && !showError && !hasPages;
  const showOverlaySpinner = canExport && !showError && hasPages && isGenerating;

  const status = showEmpty
    ? emptyMessage
    : showError
      ? "Preview unavailable"
      : isGenerating
        ? "Generating preview…"
        : hasPages
          ? `Preview ready, ${pageLabel(pageCount)}`
          : "";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex items-center gap-2">
          {hasPages && (
            <div className="flex items-center rounded-md border p-0.5">
              <Toggle
                size="sm"
                pressed={fitMode === "page"}
                onPressedChange={() => onChangeFitMode("page")}
                aria-label="Fit whole page"
                className="h-6 px-2 text-xs"
              >
                Fit page
              </Toggle>
              <Toggle
                size="sm"
                pressed={fitMode === "width"}
                onPressedChange={() => onChangeFitMode("width")}
                aria-label="Fit page width"
                className="h-6 px-2 text-xs"
              >
                Fit width
              </Toggle>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {hasPages ? pageLabel(pageCount) : ""}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        aria-label={
          hasPages ? `${previewLabel}, ${pageLabel(pageCount)}` : previewLabel
        }
        className="relative min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted p-4"
      >
        <div ref={measureRef} className="mx-auto w-full max-w-3xl">
          <div
            ref={pagesRef}
            aria-hidden="true"
            className={cn(
              "flex flex-col items-center gap-4 transition-opacity",
              showOverlaySpinner && "opacity-50",
            )}
          />
        </div>

        {(showEmpty || showError || showFirstSpinner) && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {showEmpty ? (
              emptyMessage
            ) : showError ? (
              "Preview unavailable"
            ) : (
              <Spinner className="size-6" />
            )}
          </div>
        )}

        {showOverlaySpinner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Spinner className="size-6" />
          </div>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
