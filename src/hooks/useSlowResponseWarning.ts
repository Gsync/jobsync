import { useState, useEffect } from "react";
import { APP_CONSTANTS } from "@/lib/constants";

export function useSlowResponseWarning(isLoading: boolean, hasContent: boolean) {
  const waiting = isLoading && !hasContent;
  const [showWarning, setShowWarning] = useState(false);
  // A new wait starts unwarned, so the last wait's warning never flashes.
  const [prevWaiting, setPrevWaiting] = useState(waiting);
  if (waiting !== prevWaiting) {
    setPrevWaiting(waiting);
    setShowWarning(false);
  }

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setShowWarning(true);
    }, APP_CONSTANTS.AI_SLOW_RESPONSE_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  return waiting && showWarning;
}
