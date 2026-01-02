"use client";

import { useState, useCallback, useRef } from "react";
import { ProgressUpdate } from "@/lib/ai/progress-stream";
import { ResumeReviewResponse, JobMatchResponse } from "@/models/ai.model";

type AnalysisType = "resume-review" | "job-match";

export function useCollaborativeAnalysis<
  T extends ResumeReviewResponse | JobMatchResponse
>(type: AnalysisType) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const emitProgress = useCallback((update: ProgressUpdate) => {
    const event = new CustomEvent("multiagent-progress", { detail: update });
    window.dispatchEvent(event);
  }, []);

  const start = useCallback(
    async (payload: any) => {
      setIsLoading(true);
      setError(null);
      setResult(null);

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
              const data = JSON.parse(line.substring(6));

              if (data.type === "error") {
                setError(data.message);
                setIsLoading(false);
                return;
              }

              if (data.type === "result") {
                setResult(data.data as T);
                setIsLoading(false);
                return;
              }

              // It's a progress update
              if (data.step) {
                emitProgress(data as ProgressUpdate);
              }
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        setIsLoading(false);
      }
    },
    [type, emitProgress]
  );

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    result,
    error,
    start,
    stop,
  };
}
