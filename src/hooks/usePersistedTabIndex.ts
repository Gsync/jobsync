import { useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";

// Persists the active tab by label (not index) so a reordered `labels` array
// still restores the right tab; the saved tab shows once hydrated.
export function usePersistedTabIndex(
  storageKey: string,
  labels: readonly string[],
) {
  const hydrated = useHydrated();
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  const selectTab = (index: number) => {
    setChosenIndex(index);
    saveToLocalStorage(storageKey, labels[index]);
  };

  const savedIndex = hydrated
    ? labels.indexOf(getFromLocalStorage(storageKey, null))
    : -1;
  const activeIndex = chosenIndex ?? (savedIndex !== -1 ? savedIndex : 0);

  return [activeIndex, selectTab] as const;
}
