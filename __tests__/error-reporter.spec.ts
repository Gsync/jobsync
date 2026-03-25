/**
 * Tests for src/lib/error-reporter.ts
 *
 * Verifies the in-memory ring buffer behavior, error capture,
 * and the public API surface.
 */

import {
  reportError,
  getErrors,
  clearErrors,
  getErrorCount,
  generateErrorId,
  type ErrorEntry,
} from "@/lib/error-reporter";

function makeEntry(overrides: Partial<ErrorEntry> = {}): ErrorEntry {
  return {
    id: generateErrorId(),
    timestamp: new Date(),
    message: "Test error",
    source: "error-boundary",
    ...overrides,
  };
}

describe("error-reporter", () => {
  beforeEach(() => {
    clearErrors();
  });

  describe("reportError", () => {
    it("adds an error entry to the buffer", () => {
      const entry = makeEntry({ message: "Something broke" });
      reportError(entry);
      expect(getErrorCount()).toBe(1);
      expect(getErrors()[0].message).toBe("Something broke");
    });

    it("accepts all source types", () => {
      const sources: ErrorEntry["source"][] = [
        "error-boundary",
        "unhandled-rejection",
        "console-error",
      ];
      for (const source of sources) {
        reportError(makeEntry({ source }));
      }
      expect(getErrorCount()).toBe(3);
    });

    it("stores stack and componentStack when provided", () => {
      const entry = makeEntry({
        stack: "Error: at Component (file.tsx:10)",
        componentStack: "\n    at MyComponent\n    at App",
      });
      reportError(entry);
      const stored = getErrors()[0];
      expect(stored.stack).toBe("Error: at Component (file.tsx:10)");
      expect(stored.componentStack).toBe("\n    at MyComponent\n    at App");
    });
  });

  describe("ring buffer behavior", () => {
    it("drops oldest entries when exceeding 100", () => {
      for (let i = 0; i < 110; i++) {
        reportError(makeEntry({ message: `Error ${i}` }));
      }
      expect(getErrorCount()).toBe(100);

      // The oldest 10 should be dropped (0-9), newest should be 10-109
      const errors = getErrors();
      // Newest first, so first entry is Error 109
      expect(errors[0].message).toBe("Error 109");
      // Last entry should be Error 10
      expect(errors[99].message).toBe("Error 10");
    });

    it("maintains exactly MAX_ENTRIES after many additions", () => {
      for (let i = 0; i < 200; i++) {
        reportError(makeEntry({ message: `Error ${i}` }));
      }
      expect(getErrorCount()).toBe(100);
    });
  });

  describe("getErrors", () => {
    it("returns errors newest first", () => {
      reportError(makeEntry({ message: "First" }));
      reportError(makeEntry({ message: "Second" }));
      reportError(makeEntry({ message: "Third" }));

      const errors = getErrors();
      expect(errors[0].message).toBe("Third");
      expect(errors[1].message).toBe("Second");
      expect(errors[2].message).toBe("First");
    });

    it("returns an empty array when no errors exist", () => {
      expect(getErrors()).toEqual([]);
    });

    it("returns a copy (mutations do not affect the buffer)", () => {
      reportError(makeEntry());
      const errors = getErrors();
      errors.pop();
      expect(getErrorCount()).toBe(1);
    });
  });

  describe("clearErrors", () => {
    it("empties the buffer", () => {
      reportError(makeEntry());
      reportError(makeEntry());
      expect(getErrorCount()).toBe(2);
      clearErrors();
      expect(getErrorCount()).toBe(0);
      expect(getErrors()).toEqual([]);
    });
  });

  describe("getErrorCount", () => {
    it("returns 0 when empty", () => {
      expect(getErrorCount()).toBe(0);
    });

    it("returns the correct count after adding entries", () => {
      reportError(makeEntry());
      reportError(makeEntry());
      reportError(makeEntry());
      expect(getErrorCount()).toBe(3);
    });
  });

  describe("generateErrorId", () => {
    it("returns a string starting with 'err_'", () => {
      const id = generateErrorId();
      expect(id).toMatch(/^err_/);
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateErrorId()));
      expect(ids.size).toBe(100);
    });
  });
});
