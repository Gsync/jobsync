import { useEffect, useState } from "react";
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";

// Persists the active tab by label (not index) so a reordered `labels` array
// still restores the right tab, and restores it once on mount.
export function usePersistedTabIndex(
  storageKey: string,
  labels: readonly string[],
) {
  const [activeIndex, setActiveIndex] = useState(0);

  const selectTab = (index: number) => {
    setActiveIndex(index);
    saveToLocalStorage(storageKey, labels[index]);
  };

  useEffect(() => {
    const savedLabel = getFromLocalStorage(storageKey, null);
    const savedIndex = labels.indexOf(savedLabel);
    if (savedIndex !== -1) setActiveIndex(savedIndex);
    // Restore the saved tab once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [activeIndex, selectTab] as const;
}
