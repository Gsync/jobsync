import { describe, expect, it, vi } from "vitest";
import { isSubstantialDescription, sha256, stableJson, withSqliteBusyRetry } from "./service";

describe("job evaluation identity helpers", () => {
  it("uses recursively stable JSON hashes without changing array order", () => {
    expect(stableJson({ b: { d: 1, c: 2 }, a: ["second", "first"] }))
      .toBe('{"a":["second","first"],"b":{"c":2,"d":1}}');
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
  });

  it("uses the persisted normalized description rather than write-time metadata", () => {
    expect(isSubstantialDescription(`<p>${Array.from({ length: 150 }, (_, i) => `word${i}`).join(" ")}</p>`)).toBe(true);
    expect(isSubstantialDescription("short description")).toBe(false);
  });

  it("retries transient SQLite busy errors", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("SQLITE_BUSY: database is locked"))
      .mockResolvedValueOnce("claimed");
    await expect(withSqliteBusyRetry(operation)).resolves.toBe("claimed");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("validation failed"));
    await expect(withSqliteBusyRetry(operation)).rejects.toThrow("validation failed");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
