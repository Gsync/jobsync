import { handleSaveResumeReview } from "@/lib/mcp/tools/saveResumeReview";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: { update: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const validReviewText =
  "SCORES: overall=80 impact=70 clarity=90 ats=60\n\n## Summary\nSolid resume.";

describe("handleSaveResumeReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.resume.update as any).mockResolvedValue({ id: "resume-1" });
  });

  it("parses a valid reviewText and persists the shaped ResumeReviewData (overwrite)", async () => {
    const result = await handleSaveResumeReview(
      { resumeId: "resume-1", reviewText: validReviewText },
      "user-1",
      "my-token",
    );

    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: "resume-1", profile: { userId: "user-1" } },
      data: { reviewData: expect.any(String) },
    });

    const call = (prisma.resume.update as any).mock.calls[0][0];
    const reviewData = JSON.parse(call.data.reviewData);
    expect(reviewData).toMatchObject({
      overall: 80,
      impact: 70,
      clarity: 90,
      atsCompatibility: 60,
      provider: "mcp",
      model: "my-token",
    });
    expect(reviewData.body).toContain("Solid resume.");
    expect(typeof reviewData.reviewedAt).toBe("string");

    expect(result.content[0].text).toContain("Review saved for resume resume-1");
    expect(result.content[0].text).toContain("80");
  });

  it("returns a parse-error message when reviewText has no SCORES line", async () => {
    const result = await handleSaveResumeReview(
      { resumeId: "resume-1", reviewText: "Just some prose with no scores line at all here." },
      "user-2",
      "my-token",
    );

    expect(result.content[0].text).toContain("Could not parse a SCORES line");
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });

  it("returns a not-found message on P2025 (unowned or missing resumeId)", async () => {
    (prisma.resume.update as any).mockRejectedValue({ code: "P2025" });

    const result = await handleSaveResumeReview(
      { resumeId: "someone-elses-resume", reviewText: validReviewText },
      "user-3",
      "my-token",
    );

    expect(result.content[0].text).toBe(
      "Resume not found or not owned by this token's user.",
    );
  });

  it("overwrites a prior review (last-write-wins, no pre-check)", async () => {
    await handleSaveResumeReview(
      { resumeId: "resume-1", reviewText: validReviewText },
      "user-4",
      "my-token",
    );
    await handleSaveResumeReview(
      {
        resumeId: "resume-1",
        reviewText:
          "SCORES: overall=40 impact=30 clarity=50 ats=20\n\nUpdated review.",
      },
      "user-4",
      "my-token",
    );

    expect(prisma.resume.update).toHaveBeenCalledTimes(2);
    const secondCall = (prisma.resume.update as any).mock.calls[1][0];
    const reviewData = JSON.parse(secondCall.data.reviewData);
    expect(reviewData.overall).toBe(40);
  });

  it("returns a rate-limit message and never persists when the limit is exceeded", async () => {
    (checkMcpRateLimit as any).mockReturnValueOnce({
      allowed: false,
      resetIn: 60000,
    });

    const result = await handleSaveResumeReview(
      { resumeId: "resume-1", reviewText: validReviewText },
      "user-5",
      "my-token",
    );

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });

  it("clamps out-of-range scores into 0-100", async () => {
    await handleSaveResumeReview(
      {
        resumeId: "resume-1",
        reviewText:
          "SCORES: overall=1000 impact=0 clarity=50 ats=999\n\nOverqualified.",
      },
      "user-6",
      "my-token",
    );

    const call = (prisma.resume.update as any).mock.calls[0][0];
    const reviewData = JSON.parse(call.data.reviewData);
    expect(reviewData.overall).toBe(100);
    expect(reviewData.atsCompatibility).toBe(100);
  });

  it("surfaces a generic error message on a non-P2025 DB failure", async () => {
    (prisma.resume.update as any).mockRejectedValue({ message: "connection reset" });

    const result = await handleSaveResumeReview(
      { resumeId: "resume-1", reviewText: validReviewText },
      "user-7",
      "my-token",
    );

    expect(result.content[0].text).toContain("Error: connection reset");
  });
});
