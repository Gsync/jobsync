"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getContactList } from "@/actions/contact.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { Contact } from "@/models/contact.model";

export function useContactsList(searchTerm: string, roleId?: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
      const { data, total: t } = await getContactList(
        nextPage,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        search,
        roleId,
      );
      // A slow unfiltered response must not overwrite a fast filtered one
      if (requestId !== requestIdRef.current) return;
      if (data) {
        setContacts((prev) => (nextPage === 1 ? data : [...prev, ...data]));
        setTotal(t);
        setPage(nextPage);
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [roleId],
  );

  const reload = useCallback(
    async () => load(1, searchTerm || undefined),
    [load, searchTerm],
  );

  // One effect for role changes and debounced search: both reset to page 1
  // and replace the list, so a separate mount effect would double-fetch.
  useEffect(() => {
    const timer = setTimeout(
      () => load(1, searchTerm || undefined),
      searchTerm ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [searchTerm, load]);

  const hasMore = contacts.length < total;
  const sentinelRef = useInfiniteScroll(
    hasMore,
    initialLoading || loadingMore,
    useCallback(
      () => load(page + 1, searchTerm || undefined),
      [load, page, searchTerm],
    ),
  );

  return {
    contacts,
    total,
    initialLoading,
    loadingMore,
    hasMore,
    sentinelRef,
    reload,
  };
}
