import {
  classifyBoardError,
  describeRunFailure,
} from "@/lib/notifications/boardError";

describe("classifyBoardError", () => {
  it.each([
    ["Board 'northwind' returned 404", "not_found"],
    ["Board 'northwind' returned 410", "not_found"],
    ["Board 'contoso' timed out", "timeout"],
    ["rate limited", "rate_limited"],
    ["Board 'acme' returned 429", "rate_limited"],
    ["Board 'acme' returned 503", "http_error"],
    ["Board 'acme' malformed payload", "parse"],
    ["fetch failed", "network"],
  ])("%s -> %s", (reason, code) => {
    expect(classifyBoardError(reason)).toBe(code);
  });
});

describe("describeRunFailure", () => {
  it("translates the runner's error codes", () => {
    expect(describeRunFailure("resume_missing", null)).toMatch(/resume/i);
    expect(describeRunFailure("no_companies", null)).toMatch(/watchlist/i);
    expect(describeRunFailure(null, "source_removed")).toMatch(/removed/i);
  });

  it("passes a human message through unchanged", () => {
    expect(describeRunFailure("AI provider timed out", null)).toBe(
      "AI provider timed out",
    );
  });

  it("never returns an empty string", () => {
    expect(describeRunFailure(null, null)).toBe("Unknown error");
  });
});
