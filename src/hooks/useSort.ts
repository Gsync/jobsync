"use client";
import { useCallback, useState } from "react";
import type { SortDir, SortState } from "@/models/sort.model";

const flip = (dir: SortDir): SortDir => (dir === "asc" ? "desc" : "asc");

// The third click clears: with no sort dropdown, it is the only way back
// to the page's default order.
export function nextSort<F extends string>(
  prev: SortState<F> | null,
  field: F,
  natural: SortDir,
): SortState<F> | null {
  if (!prev || prev.field !== field) return { field, dir: natural };
  if (prev.dir === natural) return { field, dir: flip(natural) };
  return null;
}

export function useSort<F extends string>(
  naturalDirs: Readonly<Record<F, SortDir>>,
) {
  const [sort, setSort] = useState<SortState<F> | null>(null);

  const toggleSort = useCallback(
    (field: F) => setSort((prev) => nextSort(prev, field, naturalDirs[field])),
    [naturalDirs],
  );

  return { sort, toggleSort };
}
