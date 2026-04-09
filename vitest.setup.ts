import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (typeof global.fetch === "undefined") {
  global.fetch = vi.fn();
}

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
