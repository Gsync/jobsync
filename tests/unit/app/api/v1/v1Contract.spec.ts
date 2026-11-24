import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/jobs/route";
import { GET } from "@/app/api/v1/ping/route";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { resolveMcpToken } from "@/lib/mcp/auth";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { ApiV1AddJobSchema } from "@/models/apiV1.schema";
import { contractViolations } from "./contract/contractCheck";
import { V1_REQUESTS, V1_RESPONSES } from "./contract/v1.contract";

vi.mock("@/lib/mcp/auth", () => ({ resolveMcpToken: vi.fn() }));
vi.mock("@/lib/mcp/rate-limit", () => ({ checkMcpRateLimit: vi.fn() }));
vi.mock("@/lib/jobs/createJobFromNames", () => ({ createJobFromNames: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));
vi.mock("@/lib/db", () => ({ default: {} }));

const rule = "Preserve public v1 clients (wiki/api.md and root CLAUDE.md, Public API v1).";
const token = {
  ok: true as const, userId: "user-1", tokenName: "Extension",
  scopes: ["jobs:write"], expiresAt: new Date("2027-02-13T10:00:00Z"),
};
const minimal = { company: "Acme", jobTitle: "Engineer" };
const headers = { authorization: "Bearer t", "content-type": "application/json" };

function post(body: unknown) {
  return POST(new Request("http://localhost/api/v1/jobs", {
    method: "POST", headers, body: JSON.stringify(body),
  }));
}

const responses = {
  created: () => post(minimal),
  duplicate() {
    vi.mocked(createJobFromNames).mockResolvedValue({
      created: false, resolutions: [], message: "Already saved",
      duplicateOf: {
        id: "j1", title: "Engineer", company: "Acme",
        location: null, status: "draft", updatable: true,
      },
    });
    return post(minimal);
  },
  validationError: () => post({}),
  rateLimited() {
    vi.mocked(checkMcpRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetIn: 1000 });
    return post(minimal);
  },
  unauthorized() {
    vi.mocked(resolveMcpToken).mockResolvedValue({ ok: false, status: 401, error: "Invalid token" });
    return post(minimal);
  },
  forbidden() {
    vi.mocked(resolveMcpToken).mockResolvedValue({ ...token, scopes: ["questions:write"] });
    return post(minimal);
  },
  ping: () => GET(new Request("http://localhost/api/v1/ping", { headers })),
} satisfies Record<keyof typeof V1_RESPONSES, () => Promise<Response>>;

describe("public API v1 contract", () => {
  beforeEach(() => {
    vi.mocked(resolveMcpToken).mockResolvedValue(token);
    vi.mocked(checkMcpRateLimit).mockReturnValue({ allowed: true, remaining: 99, resetIn: 1000 });
    vi.mocked(createJobFromNames).mockResolvedValue({
      created: true, jobId: "j1", descriptionCompleteness: "full", resolutions: [], message: "Saved",
    });
  });

  it.each(V1_REQUESTS)("still accepts the $name body", async ({ body, parsed, source }) => {
    const res = await post(body);
    const { via, ...fields } = parsed;
    expect(res.status, source).toBe(201);
    expect(createJobFromNames, source).toHaveBeenCalledWith(
      { ...fields, createdVia: via ?? token.tokenName }, token.userId,
    );
  });

  it.each(Object.entries(V1_RESPONSES))("preserves the %s response", async (name, contract) => {
    const res = await responses[name as keyof typeof responses]();
    expect(res.status, rule).toBe(contract.status);
    const body = await res.json();
    expect(contractViolations(body, contract.fields), rule).toEqual([]);
    if (name === "validationError") expect(body.issues.length, rule).toBeGreaterThan(0);
    if (name === "ping") expect(body.scopes, rule).toContain("jobs:write");
  });

  it("would catch a tightened request schema", () => {
    const request = V1_REQUESTS.find(({ name }) => name === "unknown keys")!;
    expect(ApiV1AddJobSchema.safeParse(request.body).success, rule).toBe(true);
    expect(ApiV1AddJobSchema.strict().safeParse(request.body).success, rule).toBe(false);
  });
});

describe("contractViolations", () => {
  it.each([
    [{}, ["count: expected number, got missing"]],
    [{ count: "1" }, ["count: expected number, got string"]],
    [{ count: null }, ["count: expected number, got null"]],
    [{ count: 1, extra: true }, []],
  ] as const)("checks the recorded field in %j", (actual, expected) => {
    expect(contractViolations(actual, { count: "number" })).toEqual(expected);
  });

  it("identifies the individual issue missing its message", () => {
    const actual = { issues: [{ path: "a" }, { path: "b", message: "ok" }] };
    expect(contractViolations(actual, {
      issues: "array", "issues[].path": "string", "issues[].message": "string",
    })).toEqual(["issues[0].message: expected string, got missing"]);
  });
});
