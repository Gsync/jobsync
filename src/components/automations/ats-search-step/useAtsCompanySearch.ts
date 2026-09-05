"use client";

import { useEffect, useState, useTransition, type UIEvent } from "react";
import {
  searchAtsCompanies,
  getAtsCompanyCount,
} from "@/actions/atsCompany.actions";
import type { JobBoard, LeverCompany } from "@/models/automation.model";

// Paged company search for one ATS provider, plus the provider's total
// indexed count.
export function useAtsCompanySearch(provider: JobBoard) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeverCompany[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [isSearching, startSearch] = useTransition();

  useEffect(() => {
    getAtsCompanyCount(provider)
      .then(setTotalCount)
      .catch(() => {});
  }, [provider]);

  // offset 0 replaces the list (new query / reopen); a positive offset appends
  // the next page (infinite scroll), deduping by token in case of a rapid
  // double-fire before the pending flag flips.
  const runSearch = (q: string, offset = 0) => {
    startSearch(async () => {
      const { companies: found, hasMore: more } = await searchAtsCompanies(
        provider,
        q,
        offset,
      );
      setResults((prev) => {
        if (offset === 0) return found;
        const seen = new Set(prev.map((c) => c.token));
        return [...prev, ...found.filter((c) => !seen.has(c.token))];
      });
      setHasMore(more);
    });
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    runSearch(val, 0);
  };

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next) runSearch(query, 0);
  };

  const handleListScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!hasMore || isSearching) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) {
      runSearch(query, results.length);
    }
  };

  return {
    query,
    results,
    totalCount,
    open,
    isSearching,
    handleQueryChange,
    handleOpen,
    handleListScroll,
  };
}
