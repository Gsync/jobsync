import type { BoardErrorCode } from "@/models/notification.model";

// Matches the strings the three ATS fetchers emit; the spec pins each one.
export function classifyBoardError(reason: string): BoardErrorCode {
  if (reason === "rate limited") return "rate_limited";
  if (/timed out/i.test(reason)) return "timeout";
  if (/malformed/i.test(reason)) return "parse";
  const status = reason.match(/returned (\d{3})/)?.[1];
  if (status === "404" || status === "410") return "not_found";
  // Greenhouse has no 429 branch, so its rate limit arrives as a status.
  if (status === "429") return "rate_limited";
  if (status) return "http_error";
  return "network";
}

const RUN_FAILURE_COPY: Record<string, string> = {
  resume_missing: "The resume this automation uses no longer exists.",
  no_companies: "No companies are on the watchlist.",
  source_removed: "This job board has been removed. Delete this automation.",
};

export function describeRunFailure(
  errorMessage: string | null,
  blockedReason: string | null,
): string {
  const key = blockedReason ?? errorMessage;
  if (!key) return "Unknown error";
  return RUN_FAILURE_COPY[key] ?? key;
}
