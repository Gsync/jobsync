"use client";
import { useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";

type Options<T> = {
  /** Module-level constant at every call site. */
  defaults: T;
  /** Module-level function at every call site. */
  coerce: (stored: unknown) => T;
  storageKey: string;
  open: boolean;
};

function readStored<T>(
  storageKey: string,
  coerce: (stored: unknown) => T,
  defaults: T,
): T {
  try {
    return coerce(getFromLocalStorage(storageKey, null));
  } catch {
    // getFromLocalStorage calls JSON.parse unguarded.
    return defaults;
  }
}

// Reads on open rather than at mount: localStorage is unavailable during SSR,
// and `ready` holds the preview back one commit so it generates once, with
// the stored settings, instead of once with the defaults and again after.
export function useExportSettings<T>({
  defaults,
  coerce,
  storageKey,
  open,
}: Options<T>) {
  const [settings, setSettings] = useState<T>(defaults);
  const [ready, setReady] = useState(false);
  const hydrated = useHydrated();
  const active = open && hydrated;
  const [prevActive, setPrevActive] = useState(false);
  if (active !== prevActive) {
    setPrevActive(active);
    setReady(active);
    if (active) setSettings(readStored(storageKey, coerce, defaults));
  }

  const update = (next: T) => {
    setSettings(next);
    saveToLocalStorage(storageKey, next);
  };

  return {
    settings,
    setSettings: update,
    ready,
    // Passed through, not spread: spreading an unconstrained generic does
    // not reliably narrow back to T, and nothing here mutates settings in
    // place.
    reset: () => update(defaults),
  };
}
