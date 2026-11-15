import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mcp/auth", () => ({ resolveMcpToken: vi.fn() }));
vi.mock("@/lib/mcp/rate-limit", () => ({ checkMcpRateLimit: vi.fn() }));
vi.mock("@/lib/jobs/createJobFromNames", () => ({ createJobFromNames: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));
vi.mock("@/lib/db", () => ({ default: {} }));

import { POST } from "@/app/api/v1/jobs/route";
import { resolveMcpToken } from "@/lib/mcp/auth";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { JobResolutionError } from "@/lib/jobs/resolve";
import { log } from "@/lib/telemetry";

const resolveMock = vi.mocked(resolveMcpToken);
const rateLimitMock = vi.mocked(checkMcpRateLimit);
const createMock = vi.mocked(createJobFromNames);

const minimal = { company: "Acme", jobTitle: "Engineer" };

function mockToken(scopes = ["jobs:write"]) {
  resolveMock.mockResolvedValue({
    ok: true,
    userId: "user-1",
    tokenName: "Chrome extension",
    scopes,
    expiresAt: new Date("2027-02-13T10:00:00.000Z"),
  });
}

function post(body: string | object) {
  return new Request("http://localhost/api/v1/jobs", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const createdResult = {
  created: true,
  jobId: "j1",
  descriptionCompleteness: "full" as const,
  resolutions: [],
  message: "Created Acme…",
};

describe("POST /api/v1/jobs", () => {
  beforeEach(() => {
    mockToken();
    rateLimitMock.mockReturnValue({ allowed: true, remaining: 99, resetIn: 3_600_000 });
    createMock.mockResolvedValue(createdResult);
  });

  it("authenticates before reading the body", async () => {
    resolveMock.mockResolvedValue({ ok: false, status: 401, error: "Invalid token" });

    const res = await POST(post("{"));

    expect(res.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 403 without jobs:write and spends no budget", async () => {
    mockToken(["questions:write"]);

    const res = await POST(post(minimal));

    expect(res.status).toBe(403);
    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it("returns 400 with no issues for malformed JSON", async () => {
    const res = await POST(post("{"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request", issues: [] });
  });

  it("returns 400 for a JSON body that is not an object", async () => {
    for (const body of ["null", "[]"]) {
      const res = await POST(post(body));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Invalid request");
    }
  });

  it("returns 400 naming the field", async () => {
    const res = await POST(post({ company: ",", jobTitle: "Engineer" }));

    expect(res.status).toBe(400);
    expect((await res.json()).issues[0].path).toBe("company");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 400, not 500, for values Postgres cannot store", async () => {
    const long = await POST(post({ ...minimal, location: "x".repeat(201) }));
    expect(long.status).toBe(400);
    expect((await long.json()).issues[0].path).toBe("location");

    const nul = await POST(post({ company: "Ac\u0000me", jobTitle: "Engineer" }));
    expect(nul.status).toBe(400);
    expect((await nul.json()).issues[0].path).toBe("company");

    expect(createMock).not.toHaveBeenCalled();
  });

  it("does not 500 on an out-of-range entity", async () => {
    const res = await POST(post({ company: "&#1114112;", jobTitle: "Engineer" }));

    expect(res.status).toBe(201);
    expect(log.error).not.toHaveBeenCalled();
  });

  it("passes the parsed job to createJobFromNames", async () => {
    await POST(post(minimal));

    expect(createMock).toHaveBeenCalledWith(
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobDescription: "N/A",
        createdVia: "Chrome extension",
      },
      "user-1",
    );
  });

  it("uses the trimmed via, falling back to the token name", async () => {
    await POST(post({ ...minimal, via: " My script " }));
    await POST(post({ ...minimal, via: "  " }));

    const [first, second] = createMock.mock.calls.map(([input]) => input);
    expect(first.createdVia).toBe("My script");
    expect(second.createdVia).toBe("Chrome extension");
    expect(first).not.toHaveProperty("via");
    expect(second).not.toHaveProperty("via");
  });

  it("takes userId only from the token", async () => {
    await POST(post({ ...minimal, userId: "attacker" }));

    const [input, userId] = createMock.mock.calls[0];
    expect(userId).toBe("user-1");
    expect(input).not.toHaveProperty("userId");
  });

  it("passes allowDuplicate through", async () => {
    await POST(post({ ...minimal, allowDuplicate: true }));

    expect(createMock.mock.calls[0][0].allowDuplicate).toBe(true);
  });

  it("maps a created job to 201", async () => {
    const res = await POST(post(minimal));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      created: true,
      jobId: "j1",
      jobPath: "/dashboard/myjobs/j1",
      descriptionCompleteness: "full",
    });
  });

  it("maps a duplicate to 409", async () => {
    createMock.mockResolvedValue({
      created: false,
      duplicateOf: { id: "j9", title: "Engineer", company: "Acme" },
      resolutions: [],
      message: "…",
    });

    const res = await POST(post(minimal));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      created: false,
      duplicateOf: { id: "j9", title: "Engineer", company: "Acme" },
      jobPath: "/dashboard/myjobs/j9",
    });
  });

  it("returns 429 with Retry-After", async () => {
    rateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetIn: 1_233_500 });

    const res = await POST(post(minimal));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1234");
    expect(await res.json()).toEqual({
      error: "Rate limit exceeded",
      retryAfterSeconds: 1234,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps a JobResolutionError to 400", async () => {
    createMock.mockRejectedValue(new JobResolutionError('Invalid status "x"'));

    const res = await POST(post(minimal));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("hides the error text on 500", async () => {
    createMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5"));

    const res = await POST(post(minimal));
    const raw = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(raw)).toEqual({ error: "Failed to save job" });
    expect(raw).not.toContain("ECONNREFUSED");
    expect(log.error).toHaveBeenCalled();
  });

  it("returns a JSON 500 when the token lookup throws", async () => {
    resolveMock.mockRejectedValue(new Error("db down"));

    const res = await POST(post(minimal));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to save job" });
  });
});
