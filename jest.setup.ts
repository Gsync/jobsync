import "@testing-library/jest-dom";

// Mock fetch if not defined
if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn();
}
