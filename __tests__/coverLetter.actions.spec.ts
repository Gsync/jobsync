import {
  getCoverLetterList,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetterById,
} from "@/actions/coverLetter.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    coverLetter: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    profile: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
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
    jest.clearAllMocks();
  });

  describe("getCoverLetterList", () => {
    it("should return cover letter list with default parameters", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findMany as jest.Mock).mockResolvedValue([
        mockCoverLetter,
      ]);
      (prisma.coverLetter.count as jest.Mock).mockResolvedValue(1);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.coverLetter.count as jest.Mock).mockResolvedValue(15);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getCoverLetterList();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findMany as jest.Mock).mockRejectedValue(
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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findFirst as jest.Mock).mockResolvedValue({
        id: "profile-id",
      });
      (prisma.coverLetter.create as jest.Mock).mockResolvedValue(
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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.create as jest.Mock).mockResolvedValue({
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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as jest.Mock).mockResolvedValue(
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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.findFirst as jest.Mock).mockResolvedValue({
        id: "profile-id",
      });
      (prisma.coverLetter.create as jest.Mock).mockResolvedValue(
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
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await createCoverLetter("Title", "Some content here.");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.findFirst as jest.Mock).mockRejectedValue(
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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const updated = { ...mockCoverLetter, title: "Updated Title" };
      (prisma.coverLetter.update as jest.Mock).mockResolvedValue(updated);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await updateCoverLetter("cl-id", "Title", "Content");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.update as jest.Mock).mockRejectedValue(
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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.delete as jest.Mock).mockResolvedValue(
        mockCoverLetter,
      );

      const result = await deleteCoverLetterById("cl-id");

      expect(result).toEqual({ success: true });
      expect(prisma.coverLetter.delete).toHaveBeenCalledWith({
        where: { id: "cl-id", profile: { userId: "user-id" } },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await deleteCoverLetterById("cl-id");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.coverLetter.delete as jest.Mock).mockRejectedValue(
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
