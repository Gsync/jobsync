"use client";

import { useEffect, useRef } from "react";
import { APP_CONSTANTS } from "@/lib/constants";

// Infinite scroll: auto-load next page when sentinel is visible
export function useJobsInfiniteScroll(
  loadedCount: number,
  totalJobs: number,
  loadingMore: boolean,
  onLoadMore: () => void,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          loadedCount < totalJobs
        ) {
          onLoadMore();
        }
      },
      { threshold: APP_CONSTANTS.INTERSECTION_OBSERVER_THRESHOLD },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadedCount, totalJobs, loadingMore, onLoadMore]);

  return sentinelRef;
}
