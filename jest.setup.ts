import "@testing-library/jest-dom";

// Mock fetch if not defined
if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn();
}

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
