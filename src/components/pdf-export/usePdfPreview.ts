"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { settingsKey } from "@/models/pdfExport.model";

const PREVIEW_DEBOUNCE_MS = 250;

export type PreviewResult = { blob: Blob; filename: string };

// Owns the preview artifact: debounce, cache, and blob generation. Deliberately
// touches no canvas and creates no object URL — PdfPreviewPane owns rendering.
// `generate` is held in a ref so an inline arrow at the call site does not
// re-trigger the effect on every render.
export function usePdfPreview<T extends object>(
  generate: (settings: T) => Promise<PreviewResult>,
  settings: T,
  active: boolean,
) {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Written only when a generation lands, so a cache hit needs no setState.
  const [cache, setCache] = useState(() => new Map<string, PreviewResult>());

  const hasRenderedRef = useRef(false);
  const runIdRef = useRef(0);

  // Read through refs so the effect can depend on primitives only.
  const generateRef = useRef(generate);
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    generateRef.current = generate;
    settingsRef.current = settings;
  });

  // Sorted, so a rebuilt settings object hits the same cache entry as a
  // spread one and key order carries no meaning.
  const key = settingsKey(settings);
  const cached = active ? cache.get(key) : undefined;

  // Starts "inactive" so a hook mounted open raises the spinner at once.
  const [prevActive, setPrevActive] = useState(false);
  const [prevKey, setPrevKey] = useState(key);
  if (active !== prevActive || key !== prevKey) {
    setPrevActive(active);
    setPrevKey(key);
    setError(null);
    if (!active) {
      // A document edited between openings must never show a stale preview.
      setCache(new Map());
      setResult(null);
    }
    setIsGenerating(active && !cached);
    // Tracks what is on screen, so the next regeneration keeps showing it.
    if (cached) setResult(cached);
  }

  useEffect(() => {
    if (!active) {
      hasRenderedRef.current = false;
      runIdRef.current += 1;
      return;
    }
    if (cache.has(key)) {
      runIdRef.current += 1;
      hasRenderedRef.current = true;
      return;
    }

    const runId = ++runIdRef.current;
    const run = () =>
      generateRef.current(settingsRef.current).then(
        (generated) => {
          if (runIdRef.current !== runId) return;
          setCache((prev) => new Map(prev).set(key, generated));
          setResult(generated);
          setError(null);
          setIsGenerating(false);
        },
        (e: unknown) => {
          if (runIdRef.current !== runId) return;
          setResult(null);
          setError(e instanceof Error ? e : new Error("Preview failed"));
          setIsGenerating(false);
        },
      );

    // Opening the dialog must not wait out a debounce nobody triggered.
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      void run();
      return;
    }

    const timer = setTimeout(() => void run(), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [active, key, cache]);

  const shown = cached ?? (active ? result : null);
  return {
    blob: shown?.blob ?? null,
    filename: shown?.filename ?? null,
    isGenerating,
    error,
  };
}
