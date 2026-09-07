"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCompanyList } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { Company } from "@/models/job.model";

export function useCompaniesList(
  scope: "mine" | "watchlist",
  searchTerm: string,
  active: boolean,
) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (nextPage: number, search?: string) => {
      const requestId = ++requestIdRef.current;
      if (nextPage === 1) setInitialLoading(true);
      else setLoadingMore(true);
      const { data, total: t } = await getCompanyList(
        nextPage,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        "applied",
        search,
        scope,
      );
      if (requestId !== requestIdRef.current) return;
      if (data) {
        setCompanies((prev) => (nextPage === 1 ? data : [...prev, ...data]));
        setTotal(t);
        setPage(nextPage);
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [scope],
  );

  const reload = useCallback(
    async () => load(1, searchTerm || undefined),
    [load, searchTerm],
  );

  // One effect for scope changes and debounced search: both reset to page 1
  // and replace the list, so a separate mount effect would double-fetch.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(
      () => load(1, searchTerm || undefined),
      searchTerm ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [active, scope, searchTerm, load]);

  const hasMore = companies.length < total;
  const sentinelRef = useInfiniteScroll(
    hasMore && active,
    initialLoading || loadingMore,
    useCallback(
      () => load(page + 1, searchTerm || undefined),
      [load, page, searchTerm],
    ),
  );

  return {
    companies,
    total,
    initialLoading,
    loadingMore,
    hasMore,
    sentinelRef,
    reload,
  };
}
