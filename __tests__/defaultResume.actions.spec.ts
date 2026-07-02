import {
  getDefaultResumeId,
  setDefaultResume,
  createResumeProfile,
  getResumeList,
} from "@/actions/profile.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    profile: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    file: {
      create: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Default Resume Actions", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultResumeId", () => {
    it("returns the stored pointer for the current user", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultResumeId: "resume-1",
      });

      const result = await getDefaultResumeId();

      expect(result).toBe("resume-1");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { defaultResumeId: true },
      });
    });

    it("returns null when the pointer is unset", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultResumeId: null,
      });

      expect(await getDefaultResumeId()).toBeNull();
    });

    it("returns null when unauthenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      expect(await getDefaultResumeId()).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("setDefaultResume", () => {
    it("sets the pointer to a resume the user owns", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.resume.findFirst as any).mockResolvedValue({ id: "resume-1" });
      (prisma.user.update as any).mockResolvedValue({});

      const result = await setDefaultResume("resume-1");

      expect(result).toEqual({ success: true });
      expect(prisma.resume.findFirst).toHaveBeenCalledWith({
        where: { id: "resume-1", profile: { userId: mockUser.id } },
        select: { id: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { defaultResumeId: "resume-1" },
      });
    });

    it("rejects a resume the user does not own and leaves the pointer unchanged", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.resume.findFirst as any).mockResolvedValue(null);

      const result = await setDefaultResume("foreign-resume");

      expect(result).toEqual({ success: false, message: "Resume not found" });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("returns error when unauthenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await setDefaultResume("resume-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.resume.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("createResumeProfile auto-default", () => {
    beforeEach(() => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.resume.findMany as any).mockResolvedValue([]);
    });

    it("auto-defaults the first resume (existing-profile branch)", async () => {
      (prisma.resume.count as any).mockResolvedValue(0);
      (prisma.profile.findFirst as any).mockResolvedValue({ id: "profile-1" });
      (prisma.resume.create as any).mockResolvedValue({ id: "resume-new" });
      (prisma.user.update as any).mockResolvedValue({});

      const result = await createResumeProfile("My Resume", "");

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { defaultResumeId: "resume-new" },
      });
    });

    it("auto-defaults the first resume with the resume id, not the profile id (no-profile branch)", async () => {
      (prisma.resume.count as any).mockResolvedValue(0);
      (prisma.profile.findFirst as any).mockResolvedValue(null);
      (prisma.profile.create as any).mockResolvedValue({
        id: "profile-new",
        resumes: [{ id: "resume-nested" }],
      });
      (prisma.user.update as any).mockResolvedValue({});

      const result = await createResumeProfile("My Resume", "");

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { defaultResumeId: "resume-nested" },
      });
    });

    it("does not change the default when the user already has resumes", async () => {
      (prisma.resume.count as any).mockResolvedValue(2);
      (prisma.profile.findFirst as any).mockResolvedValue({ id: "profile-1" });
      (prisma.resume.create as any).mockResolvedValue({ id: "resume-new" });

      const result = await createResumeProfile("Another Resume", "");

      expect(result.success).toBe(true);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("getResumeList default pinning", () => {
    beforeEach(() => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.resume.count as any).mockResolvedValue(3);
    });

    it("puts the default resume first on page 1, even if older", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultResumeId: "resume-default",
      });
      (prisma.resume.findFirst as any).mockResolvedValue({
        id: "resume-default",
        _count: { Job: 0, ResumeSections: 0 },
      });
      (prisma.resume.findMany as any).mockResolvedValue([
        { id: "resume-2", _count: { Job: 0, ResumeSections: 0 } },
        { id: "resume-3", _count: { Job: 0, ResumeSections: 0 } },
      ]);

      const result = await getResumeList(1, 25);

      expect(result.data.map((r: any) => r.id)).toEqual([
        "resume-default",
        "resume-2",
        "resume-3",
      ]);
      expect(prisma.resume.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "resume-default",
            profile: { userId: mockUser.id },
          },
        }),
      );
      expect(prisma.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profile: { userId: mockUser.id },
            id: { not: "resume-default" },
          },
          take: 24,
        }),
      );
    });

    it("excludes the default resume from later pages and adjusts skip", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultResumeId: "resume-default",
      });
      (prisma.resume.findMany as any).mockResolvedValue([]);

      await getResumeList(2, 25);

      expect(prisma.resume.findFirst).not.toHaveBeenCalled();
      expect(prisma.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profile: { userId: mockUser.id },
            id: { not: "resume-default" },
          },
          skip: 24,
          take: 25,
        }),
      );
    });

    it("falls back to plain skip/take when no default is set", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultResumeId: null,
      });
      (prisma.resume.findMany as any).mockResolvedValue([]);

      await getResumeList(1, 25);

      expect(prisma.resume.findFirst).not.toHaveBeenCalled();
      expect(prisma.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profile: { userId: mockUser.id } },
          skip: 0,
          take: 25,
        }),
      );
    });
  });
});
