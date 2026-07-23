import { getResumeCopyTitleSuggestion } from "@/actions/profile.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    contactInfo: { create: vi.fn() },
    resumeSection: { create: vi.fn() },
    workExperience: { createMany: vi.fn() },
    education: { createMany: vi.fn() },
    licenseOrCertification: { createMany: vi.fn() },
    otherSection: { createMany: vi.fn() },
    skill: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

describe("getResumeCopyTitleSuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
  });

  it("suggests '(Copy)' based on the owned source resume title", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue({
      title: "Backend Resume",
    });
    (prisma.resume.findMany as any).mockResolvedValue([
      { title: "Backend Resume" },
    ]);

    const result = await getResumeCopyTitleSuggestion("resume-1");

    expect(result).toEqual({ success: true, data: "Backend Resume (Copy)" });
    expect((prisma.resume.findUnique as any).mock.calls[0][0].where).toEqual({
      id: "resume-1",
      profile: { userId: "user-1" },
    });
  });

  it("numbers the suggestion when earlier copies exist", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue({
      title: "Backend Resume",
    });
    (prisma.resume.findMany as any).mockResolvedValue([
      { title: "Backend Resume" },
      { title: "Backend Resume (Copy)" },
    ]);

    const result = await getResumeCopyTitleSuggestion("resume-1");

    expect(result).toEqual({ success: true, data: "Backend Resume (Copy 2)" });
  });

  it("fails when the resume is not owned by the current user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await getResumeCopyTitleSuggestion("someone-elses-resume");

    expect(result.success).toBe(false);
  });

  it("fails when not authenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await getResumeCopyTitleSuggestion("resume-1");

    expect(result.success).toBe(false);
  });
});
