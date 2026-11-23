import { globSync, readFileSync } from "node:fs";
import { sep } from "node:path";
import { expect } from "vitest";
import { applyExceptions, type FindingKey } from "../../security/exceptions";
import type { InvariantException } from "../invariantExceptions";

export function srcFiles(): string[] {
  return globSync("src/**/*.{ts,tsx}", { exclude: ["src/generated/**"] })
    .map((file) => file.split(sep).join("/"))
    .sort();
}

export function checkSourceInvariant(
  scan: (file: string, source: string) => FindingKey[],
  exceptions: InvariantException[],
  rule: string,
) {
  const files = srcFiles();
  expect(files.length, rule).toBeGreaterThan(0);
  const findings = files.flatMap((file) => scan(file, readFileSync(file, "utf8")));
  const { unexcepted, stale } = applyExceptions(findings, exceptions);
  expect(unexcepted, rule).toEqual([]);
  expect(stale, `Re-review stale exceptions. ${rule}`).toEqual([]);
  expect(exceptions.filter((e) => !e.reason.trim()), `Explain every exception. ${rule}`).toEqual([]);
}
