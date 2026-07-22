import { handleSaveMatchResult } from "@/lib/mcp/tools/saveMatchResult";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: { update: vi.fn() },
    user: { findUnique: vi.fn() },
    resume: { findFirst: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const validMatchText =
  "SCORES: match=78 recommendation=good\n\n## Strengths\nSolid backend experience.";

describe("handleSaveMatchResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({
      defaultResumeId: "resume-1",
    });
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: "resume-1",
      title: "My Resume",
    });
    (prisma.job.update as any).mockResolvedValue({ id: "job-1" });
  });

  it("parses a valid matchText and persists clamped score + shaped matchData", async () => {
    const result = await handleSaveMatchResult(
      { jobId: "job-1", matchText: validMatchText },
      "user-1",
      "my-token",
    );

    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: "job-1", userId: "user-1", createdVia: { not: null } },
      data: {
        matchScore: 78,
        matchData: expect.any(String),
      },
    });

    const call = (prisma.job.update as any).mock.calls[0][0];
    const matchData = JSON.parse(call.data.matchData);
    expect(matchData).toMatchObject({
      matchScore: 78,
      recommendation: "good match",
      resumeId: "resume-1",
      resumeTitle: "My Resume",
      provider: "mcp",
      model: "my-token",
      analyzed: true,
    });
    expect(matchData.body).toContain("Solid backend experience.");
    expect(typeof matchData.matchedAt).toBe("string");

    expect(result.content[0].text).toContain("Match saved for job job-1");
    expect(result.content[0].text).toContain("good match");
    expect(result.content[0].text).toContain("78");
    expect(result.structuredContent).toMatchObject({
      saved: true,
      jobId: "job-1",
      score: 78,
      recommendation: "good match",
      errorCode: null,
    });
  });

  it("returns a parse-error message when matchText has no SCORES line", async () => {
    const result = await handleSaveMatchResult(
      { jobId: "job-1", matchText: "Just some prose with no scores line at all here." },
      "user-2",
      "my-token",
    );

    expect(result.content[0].text).toContain("Could not parse a SCORES line");
    expect(result.structuredContent.errorCode).toBe("invalid_match_format");
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it("returns a not-found/not-eligible message on P2025 (non-owned or non-MCP-created job)", async () => {
    (prisma.job.update as any).mockRejectedValue({ code: "P2025" });

    const result = await handleSaveMatchResult(
      { jobId: "someone-elses-job", matchText: validMatchText },
      "user-3",
      "my-token",
    );

    expect(result.content[0].text).toBe(
      "Job not found, not owned by this token's user, or not eligible for a match via MCP.",
    );
    expect(result.structuredContent.errorCode).toBe("not_found_or_forbidden");
  });

  it("overwrites a prior match (last-write-wins, no pre-check)", async () => {
    await handleSaveMatchResult(
      { jobId: "job-1", matchText: validMatchText },
      "user-4",
      "my-token",
    );
    await handleSaveMatchResult(
      {
        jobId: "job-1",
        matchText: "SCORES: match=40 recommendation=weak\n\nUpdated analysis.",
      },
      "user-4",
      "my-token",
    );

    expect(prisma.job.update).toHaveBeenCalledTimes(2);
    const secondCall = (prisma.job.update as any).mock.calls[1][0];
    expect(secondCall.data.matchScore).toBe(40);
  });

  it("omits resumeId/resumeTitle when no default resume is set (best-effort)", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ defaultResumeId: null });

    await handleSaveMatchResult(
      { jobId: "job-1", matchText: validMatchText },
      "user-5",
      "my-token",
    );

    const call = (prisma.job.update as any).mock.calls[0][0];
    const matchData = JSON.parse(call.data.matchData);
    expect(matchData.resumeId).toBeUndefined();
    expect(matchData.resumeTitle).toBeUndefined();
  });

  it("prefers the echoed resumeId for provenance over the current default", async () => {
    (prisma.resume.findFirst as any).mockResolvedValue({
      id: "resume-scored",
      title: "Scored Resume",
    });

    await handleSaveMatchResult(
      { jobId: "job-1", resumeId: "resume-scored", matchText: validMatchText },
      "user-6",
      "my-token",
    );

    expect(prisma.resume.findFirst).toHaveBeenCalledWith({
      where: { id: "resume-scored", profile: { userId: "user-6" } },
      select: { id: true, title: true },
    });
    // Echoed id resolved, so the default lookup is skipped entirely.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();

    const call = (prisma.job.update as any).mock.calls[0][0];
    const matchData = JSON.parse(call.data.matchData);
    expect(matchData.resumeId).toBe("resume-scored");
    expect(matchData.resumeTitle).toBe("Scored Resume");
  });

  it("falls back to the current default when an echoed resumeId no longer resolves", async () => {
    // Echoed id doesn't resolve; default lookup then succeeds.
    (prisma.resume.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "resume-1", title: "My Resume" });

    await handleSaveMatchResult(
      { jobId: "job-1", resumeId: "stale-resume", matchText: validMatchText },
      "user-7",
      "my-token",
    );

    expect(prisma.user.findUnique).toHaveBeenCalled();
    const call = (prisma.job.update as any).mock.calls[0][0];
    const matchData = JSON.parse(call.data.matchData);
    expect(matchData.resumeId).toBe("resume-1");
  });

  it("returns a rate-limit message and never persists when the limit is exceeded", async () => {
    (checkMcpRateLimit as any).mockReturnValueOnce({
      allowed: false,
      resetIn: 60000,
    });

    const result = await handleSaveMatchResult(
      { jobId: "job-1", matchText: validMatchText },
      "user-8",
      "my-token",
    );

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it("clamps an out-of-range score into 0-100", async () => {
    await handleSaveMatchResult(
      {
        jobId: "job-1",
        matchText: "SCORES: match=150 recommendation=strong\n\nOverqualified.",
      },
      "user-9",
      "my-token",
    );

    const call = (prisma.job.update as any).mock.calls[0][0];
    expect(call.data.matchScore).toBe(100);
    const matchData = JSON.parse(call.data.matchData);
    expect(matchData.matchScore).toBe(100);
    expect(matchData.recommendation).toBe("strong match");
  });

  it("surfaces a generic error message on a non-P2025 DB failure", async () => {
    (prisma.job.update as any).mockRejectedValue({ message: "connection reset" });

    const result = await handleSaveMatchResult(
      { jobId: "job-1", matchText: validMatchText },
      "user-10",
      "my-token",
    );

    expect(result.content[0].text).toContain("Error: connection reset");
  });
});
