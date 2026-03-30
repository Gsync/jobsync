import { useState, useEffect, useRef } from "react";
import { APP_CONSTANTS } from "@/lib/constants";

export function useSlowResponseWarning(isLoading: boolean, hasContent: boolean) {
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading && !hasContent) {
      timerRef.current = setTimeout(() => {
        setShowWarning(true);
      }, APP_CONSTANTS.AI_SLOW_RESPONSE_THRESHOLD_MS);
    } else {
      setShowWarning(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, hasContent]);

  return showWarning;
}
