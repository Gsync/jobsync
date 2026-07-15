// Tests for the localStorage helpers with their SSR guard.

import {
  saveToLocalStorage,
  getFromLocalStorage,
} from "@/utils/localstorage.utils";

describe("localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value through save/get", () => {
    saveToLocalStorage("prefs", { theme: "dark", count: 3 });

    expect(getFromLocalStorage("prefs", null)).toEqual({
      theme: "dark",
      count: 3,
    });
  });

  it("returns the default when the key is absent", () => {
    expect(getFromLocalStorage("missing", "fallback")).toBe("fallback");
  });

  it("serializes non-object values", () => {
    saveToLocalStorage("n", 42);
    expect(localStorage.getItem("n")).toBe("42");
    expect(getFromLocalStorage("n", 0)).toBe(42);
  });
});
