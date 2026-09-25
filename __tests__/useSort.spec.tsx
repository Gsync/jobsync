import { act, renderHook } from "@testing-library/react";
import { nextSort, useSort } from "@/hooks/useSort";

describe("nextSort", () => {
  it("starts a new column in its natural direction", () => {
    expect(nextSort(null, "date", "desc")).toEqual({ field: "date", dir: "desc" });
  });

  it("reverses on the second click", () => {
    expect(nextSort({ field: "date", dir: "desc" }, "date", "desc")).toEqual({
      field: "date",
      dir: "asc",
    });
  });

  it("clears on the third click", () => {
    expect(nextSort({ field: "date", dir: "asc" }, "date", "desc")).toBeNull();
  });

  it("switching columns restarts at the new column's natural direction", () => {
    expect(nextSort({ field: "date", dir: "asc" }, "name", "asc")).toEqual({
      field: "name",
      dir: "asc",
    });
  });
});

describe("useSort", () => {
  const DIRS = { date: "desc", name: "asc" } as const;

  it("starts unsorted and cycles natural → reversed → off", () => {
    const { result } = renderHook(() => useSort(DIRS));
    expect(result.current.sort).toBeNull();

    act(() => result.current.toggleSort("date"));
    expect(result.current.sort).toEqual({ field: "date", dir: "desc" });

    act(() => result.current.toggleSort("date"));
    expect(result.current.sort).toEqual({ field: "date", dir: "asc" });

    act(() => result.current.toggleSort("date"));
    expect(result.current.sort).toBeNull();
  });
});
