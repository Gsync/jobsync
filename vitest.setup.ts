import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (typeof global.fetch === "undefined") {
  global.fetch = vi.fn();
}

// Node ≥23 ships a global localStorage stub without the Storage API
// (no .clear), which shadows jsdom's working one in workers. Replace it
// only when broken — a real browser/jsdom Storage is left untouched.
if (typeof (globalThis as any).localStorage?.clear !== "function") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;
