// Reviewed exceptions for the static security guardrails. Every entry must
// match exactly one current finding, so a stale entry fails its spec.

export type ExceptionCategory = "public" | "alternate-auth" | "contract-exception" | "known-gap";

export interface FindingKey {
  file: string;
  target: string;
  check: string;
}

export interface SecurityException extends FindingKey {
  category: ExceptionCategory;
  reason: string;
  issue?: string;
}

const sameFinding = (a: FindingKey, b: FindingKey) =>
  a.file === b.file && a.target === b.target && a.check === b.check;

export function applyExceptions<F extends FindingKey>(
  findings: F[],
  exceptions: SecurityException[],
) {
  const unexcepted = findings.filter((f) => !exceptions.some((e) => sameFinding(e, f)));
  const stale = exceptions
    .map((exception) => ({
      exception,
      matches: findings.filter((f) => sameFinding(exception, f)).length,
    }))
    .filter(({ matches }) => matches !== 1);
  return { unexcepted, stale };
}

const MODEL_ROUTE_GAP = "docs/issues/api-model-route-auth-guards.md";
const NEXTAUTH = "src/app/api/auth/[...nextauth]/route.ts";
const MCP = "src/app/api/mcp/route.ts";

export const ROUTE_EXCEPTIONS: SecurityException[] = [
  ...["openai", "gemini", "deepseek"].map((provider) => ({
    file: `src/app/api/ai/${provider}/models/route.ts`,
    target: "GET",
    check: "status-401",
    category: "known-gap" as const,
    reason: "Reads the session but never rejects an absent one",
    issue: MODEL_ROUTE_GAP,
  })),
  {
    file: "src/app/api/automations/[id]/logs/route.ts",
    target: "GET",
    check: "status-401",
    category: "contract-exception",
    reason: "SSE stream rejects an absent session with an error frame, status 200",
  },
  ...["GET", "POST"].map((target) => ({
    file: NEXTAUTH,
    target,
    check: "unresolved-handler",
    category: "public" as const,
    reason: "NextAuth's own sign-in and session handlers",
  })),
  {
    file: NEXTAUTH,
    target: "/api/auth/test/path",
    check: "proxy-coverage",
    category: "public",
    reason: "Proxy matcher excludes /api/auth so sign-in stays reachable",
  },
  ...["POST", "DELETE"].map((target) => ({
    file: MCP,
    target,
    check: "auth-call",
    category: "alternate-auth" as const,
    reason: "PAT auth through resolveMcpToken (src/lib/mcp/auth.ts)",
  })),
  {
    file: MCP,
    target: "GET",
    check: "auth-call",
    category: "alternate-auth",
    reason: "Returns 405 without touching data; POST/DELETE carry PAT auth",
  },
  {
    file: MCP,
    target: "/api/mcp",
    check: "proxy-coverage",
    category: "alternate-auth",
    reason: "Proxy matcher excludes /api/mcp; the route checks its own PAT",
  },
];
