"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAtsCompanyCount,
  searchAtsCompanies,
} from "@/actions/atsCompany.actions";
import { getWatchedBoards } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { JobBoard, LeverCompany } from "@/models/automation.model";

// Browse pages the JSON seed at 50 while the reference lists page the database
// at 25 — different sources, different costs, deliberately not unified.
export function useBoardsBrowse(provider: JobBoard | null, searchTerm: string) {
  const [rows, setRows] = useState<LeverCompany[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [seedTotal, setSeedTotal] = useState<number | undefined>(undefined);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // token -> companyId, so "Watching ✓" can toggle back off in place.
  const [watchedMap, setWatchedMap] = useState<Map<string, string>>(new Map());
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (offset: number, search: string) => {
      if (!provider) return;
      const requestId = ++requestIdRef.current;
      if (offset === 0) setInitialLoading(true);
      else setLoadingMore(true);
      const { companies, hasMore: more } = await searchAtsCompanies(
        provider,
        search,
        offset,
      );
      if (requestId !== requestIdRef.current) return;
      setRows((prev) => {
        if (offset === 0) return companies;
        const seen = new Set(prev.map((c) => c.token));
        return [...prev, ...companies.filter((c) => !seen.has(c.token))];
      });
      setHasMore(more);
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [provider],
  );

  // The watchlist is tens of rows in a different store, so it is fetched once
  // per provider change and held as a Map — infinite scroll then costs one
  // JSON call per page and zero database calls.
  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    getWatchedBoards(provider).then((boards) => {
      if (cancelled) return;
      setWatchedMap(new Map(boards.map((b) => [b.token, b.id])));
    });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    setSeedTotal(undefined);
    getAtsCompanyCount(provider)
      .then(setSeedTotal)
      .catch(() => {});
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    setRows([]);
    const timer = setTimeout(() => load(0, searchTerm), searchTerm ? 300 : 0);
    return () => clearTimeout(timer);
  }, [provider, searchTerm, load]);

  const sentinelRef = useInfiniteScroll(
    hasMore && !!provider,
    initialLoading || loadingMore,
    useCallback(
      () => load(rows.length, searchTerm),
      [load, rows.length, searchTerm],
    ),
  );

  const markWatched = useCallback((token: string, companyId: string) => {
    setWatchedMap((prev) => new Map(prev).set(token, companyId));
  }, []);

  const unmarkWatched = useCallback((token: string) => {
    setWatchedMap((prev) => {
      const next = new Map(prev);
      next.delete(token);
      return next;
    });
  }, []);

  return {
    rows,
    hasMore,
    // Only meaningful with an empty search box: searchAtsCompanies returns no
    // filtered total, so during a search the header shows a loaded count only.
    total: searchTerm ? undefined : seedTotal,
    initialLoading,
    loadingMore,
    sentinelRef,
    watchedMap,
    markWatched,
    unmarkWatched,
    pageSize: APP_CONSTANTS.ATS_COMPANY_PAGE_SIZE,
  };
}
