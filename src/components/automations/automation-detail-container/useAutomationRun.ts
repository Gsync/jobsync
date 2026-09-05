"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toastSuccess, toastError } from "@/lib/toast";
import { getAutomationRuns } from "@/actions/automation.actions";
import type { AutomationWithResume } from "@/models/automation.model";
import type { LogData } from "@/components/automations/LogsTab";

interface UseAutomationRunArgs {
  automationId: string;
  automation: AutomationWithResume | null;
  // Id of the most recent run as of the last load, so a newly started run can
  // be told apart from the prior one.
  latestRunId: string | null;
  loadData: (showLoading?: boolean) => Promise<void>;
  refreshJobs: () => Promise<void>;
}

// Owns the manual-run lifecycle: the live log stream, the run watcher, and the
// Run Now / Abort controls. These share runKey and the seen-running signal, so
// they stay in one hook rather than depending on each other across hooks.
export function useAutomationRun({
  automationId,
  automation,
  latestRunId,
  loadData,
  refreshJobs,
}: UseAutomationRunArgs) {
  const [runNowLoading, setRunNowLoading] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [abortConfirmOpen, setAbortConfirmOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);
  // The latest run id at the moment a manual run is started, so the watcher can
  // tell the newly-created background run apart from the prior one.
  const prevLatestRunIdRef = useRef<string | null>(null);
  // Live run logs/status from the /logs SSE. Owned here (not in LogsTab) so the
  // connection survives tab switches and the "Running" status stays visible in
  // the header regardless of which tab is open.
  const [logData, setLogData] = useState<LogData>({
    logs: [],
    isRunning: false,
  });
  // Tracks whether the freshly-requested run has actually gone live on this
  // connection, so we don't latch onto the previous run's completed snapshot.
  const seenRunningRef = useRef(false);

  // Subscribe to the live log/status stream at the page level so it persists
  // across tab switches. runKey bumps on Run Now to follow the new run.
  useEffect(() => {
    if (runKey > 0) {
      setLogData({ logs: [], isRunning: true });
      seenRunningRef.current = false;
    }

    const eventSource = new EventSource(
      `/api/automations/${automationId}/logs`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data: LogData = JSON.parse(event.data);
        if (data.isRunning) seenRunningRef.current = true;

        // Right after requesting a new run, the server may still be serving the
        // previous run's completed snapshot (or an empty store). Ignore those
        // until the new run goes live so we don't show stale logs or close early.
        if (runKey > 0 && !seenRunningRef.current && !data.isRunning) {
          return;
        }

        setLogData(data);
        // Close once the run is done so EventSource doesn't loop on reconnect.
        // On a fresh run (runKey>0) only close after it has gone live, so a
        // stale completed snapshot doesn't shut the stream before logs arrive.
        if (
          !data.isRunning &&
          data.completedAt &&
          (seenRunningRef.current || runKey === 0)
        ) {
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse log data:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [automationId, runKey]);

  // When a run is being followed only via the SSE (user navigated away and
  // back, so runNowLoading is false and the run watcher isn't polling), the
  // page won't otherwise refresh its tabs when the run ends. Detect the
  // live->done transition off the stream and reload then.
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (logData.isRunning) {
      wasRunningRef.current = true;
    } else if (wasRunningRef.current) {
      wasRunningRef.current = false;
      if (!runNowLoading) loadData();
    }
  }, [logData.isRunning, runNowLoading, loadData]);

  const handleClearLogs = useCallback(async () => {
    try {
      await fetch(`/api/automations/${automationId}/logs/clear`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to clear server logs:", err);
    }
    // Only empty the visible logs; keep isRunning/started/completed so the
    // "Running" badge survives and the live SSE keeps feeding new logs in.
    setLogData((prev) => ({ ...prev, logs: [] }));
  }, [automationId]);

  // While a manual run is in flight, jobs are persisted to the DB
  // incrementally (un-analyzed tier first, then each LLM-analyzed job).
  // Poll so they surface live instead of all at once when the run ends.
  useEffect(() => {
    if (!runNowLoading) return;
    const interval = setInterval(refreshJobs, 3000);
    return () => clearInterval(interval);
  }, [runNowLoading, refreshJobs]);

  // The run executes in the background on the server, so the /run request
  // returns immediately. Watch the run record until it reaches a terminal
  // status, then surface the outcome and refresh the tabs.
  useEffect(() => {
    if (!runNowLoading) return;
    let stopped = false;

    const poll = async () => {
      const res = await getAutomationRuns(automationId);
      if (stopped || !res.success || !res.data) return;
      const latest = res.data[0];
      // Wait for the new background run row to appear (different id from the run
      // that was latest when we started), so we don't read the prior run's
      // already-terminal status as this run's completion.
      if (!latest || latest.id === prevLatestRunIdRef.current) return;
      if (latest.status === "running" || latest.status === "cancelling") return;
      stopped = true;
      setRunNowLoading(false);
      setAborting(false);
      // Run is terminal; drop the live-follow signal so a later LogsTab remount
      // (e.g. switching tabs) doesn't re-init its badge to "Running".
      setRunKey(0);
      if (latest.status === "cancelled") {
        toastError(`Saved ${latest.jobsSaved} new jobs`, "Run cancelled");
      } else {
        toastSuccess(
          `Saved ${latest.jobsSaved} new jobs`,
          "Automation run complete",
        );
      }
      loadData();
    };

    const interval = setInterval(poll, 2000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [runNowLoading, automationId, loadData]);

  const handleRunNow = async () => {
    if (!automation) return;

    prevLatestRunIdRef.current = latestRunId;
    setRunNowLoading(true);
    setAborting(false);
    // Signal the Logs tab to reconnect and follow this new run. The server's
    // startRun replaces the in-memory store, and LogsTab ignores the prior
    // run's completed snapshot until this run goes live.
    setRunKey((prev) => prev + 1);

    try {
      const response = await fetch(`/api/automations/${automation.id}/run`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setRunNowLoading(false);
        // 409 means a run IS genuinely active elsewhere (another tab, the
        // scheduler) — leave the optimistic running state alone so it keeps
        // following that real run's live SSE snapshot instead of flipping
        // the Abort Run button back to Run Now while a run is in progress.
        if (response.status !== 409) {
          // The run never went live, so the SSE stream will never report
          // isRunning:false for this runKey (it only accepts that snapshot
          // after first seeing a running one) — reset directly or the
          // Abort Run button spins forever.
          setRunKey(0);
          setLogData((prev) => ({ ...prev, isRunning: false }));
        }
        toastError(data.message || "Failed to start run");
      }
      // On success the run is running in the background; the watcher effect
      // above handles completion.
    } catch {
      setRunNowLoading(false);
      setRunKey(0);
      setLogData((prev) => ({ ...prev, isRunning: false }));
      toastError("Failed to start run");
    }
  };

  const handleAbortRun = async () => {
    if (!automation) return;
    setAbortConfirmOpen(false);
    setAborting(true);
    // Flag the run in the DB; the background runner polls this flag, aborts the
    // in-flight LLM call, and finalizes the run as cancelled. The watcher effect
    // detects the terminal status.
    await fetch(`/api/automations/${automation.id}/cancel`, {
      method: "POST",
    }).catch(() => {});
  };

  return {
    logData,
    runNowLoading,
    aborting,
    abortConfirmOpen,
    setAbortConfirmOpen,
    handleRunNow,
    handleAbortRun,
    handleClearLogs,
  };
}
