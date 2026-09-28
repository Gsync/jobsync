"use client";
import { useEffect, useRef, useState } from "react";
import { getJobFilterCounts } from "@/actions/job.actions";
import { JobFacets, JobFilterCounts, JobListScope } from "@/models/job.model";

// Live counts for the popover draft: debounced, and only the newest request
// may write so a slow reply can't label the button with an older draft.
export function useJobFilterCounts({
  enabled,
  facets,
  search,
  scope,
}: {
  enabled: boolean;
  facets: JobFacets;
  search: string;
  scope: JobListScope;
}): JobFilterCounts | null {
  const [counts, setCounts] = useState<JobFilterCounts | null>(null);
  const requestSeq = useRef(0);
  const key = JSON.stringify([facets, search, scope]);

  useEffect(() => {
    if (!enabled) {
      // A reopen must not show totals for the draft that was just discarded,
      // including a reply still in flight.
      requestSeq.current++;
      setCounts(null);
      return;
    }
    const timer = setTimeout(async () => {
      const request = ++requestSeq.current;
      const result = await getJobFilterCounts(facets, search, scope);
      if (request !== requestSeq.current) return;
      setCounts(result?.success ? result.data : null);
    }, 300);
    return () => clearTimeout(timer);
    // `key` stands in for the three objects, which are rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  return counts;
}
