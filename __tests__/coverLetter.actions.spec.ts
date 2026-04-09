import {
  getCoverLetterList,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetterById,
} from "@/actions/coverLetter.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    coverLetter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function() { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

describe("coverLetterActions", () => {
  const mockUser = { id: "user-id" };
  const mockCoverLetter = {
    id: "cl-id",
    profileId: "profile-id",
    title: "My Cover Letter",
    content: "This is the content of my cover letter for the position.",
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { Job: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCoverLetterList", () => {
    it("should return cover letter list with default parameters", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findMany as any).mockResolvedValue([
        mockCoverLetter,
      ]);
      (prisma.coverLetter.count as any).mockResolvedValue(1);

      const result = await getCoverLetterList();

      expect(result).toEqual({
        success: true,
        data: [mockCoverLetter],
        total: 1,
      });
      expect(prisma.coverLetter.findMany).toHaveBeenCalledWith({
        where: {
          profile: { userId: mockUser.id },
        },
        skip: 0,
        take: 25,
        select: {
          id: true,
          profileId: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { Job: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(prisma.coverLetter.count).toHaveBeenCalledWith({
        where: {
          profile: { userId: mockUser.id },
        },
      });
    });

    it("should return cover letter list with pagination", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findMany as any).mockResolvedValue([]);
      (prisma.coverLetter.count as any).mockResolvedValue(15);

      const result = await getCoverLetterList(2, 5);

      expect(result).toEqual({
        success: true,
        data: [],
        total: 15,
      });
      expect(prisma.coverLetter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getCoverLetterList();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findMany as any).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await getCoverLetterList();

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("createCoverLetter", () => {
    it("should create a cover letter when profile exists", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as any).mockResolvedValue(null);
      (prisma.profile.findFirst as any).mockResolvedValue({
        id: "profile-id",
      });
      (prisma.coverLetter.create as any).mockResolvedValue(
        mockCoverLetter,
      );

      const result = await createCoverLetter(
        "My Cover Letter",
        "This is the content of my cover letter for the position.",
      );

      expect(result).toEqual({
        success: true,
        data: mockCoverLetter,
      });
      expect(prisma.coverLetter.create).toHaveBeenCalledWith({
        data: {
          profileId: "profile-id",
          title: "My Cover Letter",
          content:
            "This is the content of my cover letter for the position.",
        },
      });
    });

    it("should create a profile and cover letter when no profile exists", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as any).mockResolvedValue(null);
      (prisma.profile.findFirst as any).mockResolvedValue(null);
      (prisma.profile.create as any).mockResolvedValue({
        id: "new-profile-id",
      });

      const result = await createCoverLetter("New CL", "Content for the new cover letter here.");

      expect(result).toEqual({
        success: true,
        data: { id: "new-profile-id" },
      });
      expect(prisma.profile.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          coverLetters: {
            create: [
              { title: "New CL", content: "Content for the new cover letter here." },
            ],
          },
        },
      });
      expect(prisma.coverLetter.create).not.toHaveBeenCalled();
    });

    it("should return error when title already exists", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as any).mockResolvedValue(
        mockCoverLetter,
      );

      const result = await createCoverLetter(
        "My Cover Letter",
        "Some content for the cover letter.",
      );

      expect(result).toEqual({
        success: false,
        message: "Cover letter title already exists!",
      });
      expect(prisma.coverLetter.create).not.toHaveBeenCalled();
      expect(prisma.profile.create).not.toHaveBeenCalled();
    });

    it("should check title case-insensitively with trimming", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as any).mockResolvedValue(null);
      (prisma.profile.findFirst as any).mockResolvedValue({
        id: "profile-id",
      });
      (prisma.coverLetter.create as any).mockResolvedValue(
        mockCoverLetter,
      );

      await createCoverLetter(
        "  My Cover Letter  ",
        "This is the content of my cover letter for the position.",
      );

      expect(prisma.coverLetter.findFirst).toHaveBeenCalledWith({
        where: {
          title: "my cover letter",
          profile: { userId: mockUser.id },
        },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await createCoverLetter("Title", "Some content here.");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as any).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await createCoverLetter("Title", "Some content here.");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("updateCoverLetter", () => {
    it("should update a cover letter successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const updated = { ...mockCoverLetter, title: "Updated Title" };
      (prisma.coverLetter.update as any).mockResolvedValue(updated);

      const result = await updateCoverLetter(
        "cl-id",
        "Updated Title",
        "Updated content for the cover letter.",
      );

      expect(result).toEqual({
        success: true,
        data: updated,
      });
      expect(prisma.coverLetter.update).toHaveBeenCalledWith({
        where: { id: "cl-id", profile: { userId: "user-id" } },
        data: { title: "Updated Title", content: "Updated content for the cover letter." },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await updateCoverLetter("cl-id", "Title", "Content");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.update as any).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await updateCoverLetter("cl-id", "Title", "Content");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("deleteCoverLetterById", () => {
    it("should delete a cover letter successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.delete as any).mockResolvedValue(
        mockCoverLetter,
      );

      const result = await deleteCoverLetterById("cl-id");

      expect(result).toEqual({ success: true });
      expect(prisma.coverLetter.delete).toHaveBeenCalledWith({
        where: { id: "cl-id", profile: { userId: "user-id" } },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteCoverLetterById("cl-id");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.coverLetter.delete as any).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await deleteCoverLetterById("cl-id");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });
});
