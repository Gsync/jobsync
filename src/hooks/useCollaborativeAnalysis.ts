"use client";

import { useState, useCallback, useRef } from "react";
import { ProgressUpdate } from "@/lib/ai/progress-stream";
import { ResumeReviewResponse, JobMatchResponse } from "@/models/ai.model";

type AnalysisType = "resume-review" | "job-match";

// Default timeout for collaborative analysis (2 minutes)
const DEFAULT_TIMEOUT_MS = 120000;

export function useCollaborativeAnalysis<
  T extends ResumeReviewResponse | JobMatchResponse
>(type: AnalysisType, options?: { timeoutMs?: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const emitProgress = useCallback((update: ProgressUpdate) => {
    const event = new CustomEvent("multiagent-progress", { detail: update });
    window.dispatchEvent(event);
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (payload: unknown) => {
      // Clean up any previous request
      cleanup();

      setIsLoading(true);
      setError(null);
      setResult(null);
      setTimedOut(false);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      // Set up timeout
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      timeoutIdRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setTimedOut(true);
          setError(
            `Analysis timed out after ${Math.round(timeoutMs / 1000)} seconds`
          );
          setIsLoading(false);
        }
      }, timeoutMs);

      const endpoint =
        type === "resume-review"
          ? "/api/ai/resume/review-collaborative"
          : "/api/ai/resume/match-collaborative";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Request failed");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n").filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.type === "error") {
                  setError(data.message);
                  setIsLoading(false);
                  cleanup();
                  return;
                }

                if (data.type === "result") {
                  setResult(data.data as T);
                  setIsLoading(false);
                  cleanup();
                  return;
                }

                // It's a progress update
                if (data.step) {
                  emitProgress(data as ProgressUpdate);
                }
              } catch {
                // Skip malformed JSON lines
                console.warn("Malformed SSE data:", line);
              }
            }
          }
        }

        // Stream ended without explicit result
        setIsLoading(false);
        cleanup();
      } catch (err) {
        // Ignore abort errors (user cancellation or timeout)
        if (err instanceof Error && err.name === "AbortError") {
          if (!timedOut) {
            setError("Analysis was cancelled");
          }
          setIsLoading(false);
          cleanup();
          return;
        }

        const message = err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        setIsLoading(false);
        cleanup();
      }
    },
    [type, emitProgress, cleanup, options?.timeoutMs, timedOut]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cleanup();
    setIsLoading(false);
  }, [cleanup]);

  return {
    isLoading,
    result,
    error,
    timedOut,
    start,
    stop,
  };
}
