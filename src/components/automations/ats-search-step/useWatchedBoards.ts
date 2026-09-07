"use client";

import { useEffect, useState } from "react";
import { getWatchedBoards } from "@/actions/company.actions";
import type { JobBoard, LeverCompany } from "@/models/automation.model";

// Fetches the watched boards for one provider. Mapped to the wizard's
// { name, token, host? } shape — the id and provider that getWatchedBoards
// carries for the Library's Browse view are not wizard state.
export function useWatchedBoards(provider: JobBoard, enabled: boolean) {
  const [watched, setWatched] = useState<LeverCompany[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    getWatchedBoards(provider)
      .then((boards) => {
        if (cancelled) return;
        setWatched(
          boards.map((b) => ({
            name: b.name,
            token: b.token,
            ...(b.host ? { host: b.host } : {}),
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, enabled]);

  return { watched, loading };
}
