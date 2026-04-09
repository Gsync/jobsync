import {
  getAllTags,
  getTagList,
  createTag,
  deleteTagById,
} from "@/actions/tag.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    tag: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
    question: {
      count: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function() { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

describe("Tag Actions", () => {
  const mockUser = { id: "user-id" };

  const mockTag = {
    id: "tag-1",
    label: "React",
    value: "react",
    createdBy: mockUser.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // getAllTags
  describe("getAllTags", () => {
    it("should return all tags for the authenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockTags = [
        mockTag,
        { ...mockTag, id: "tag-2", label: "TypeScript", value: "typescript" },
      ];
      (prisma.tag.findMany as any).mockResolvedValue(mockTags);

      const result = await getAllTags();

      expect(result).toEqual(mockTags);
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        orderBy: { label: "asc" },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getAllTags();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.tag.findMany as any).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getAllTags();

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // getTagList
  describe("getTagList", () => {
    it("should return paginated tag list with counts", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [{ ...mockTag, _count: { jobs: 3, questions: 2 } }];
      (prisma.tag.findMany as any).mockResolvedValue(mockData);
      (prisma.tag.count as any).mockResolvedValue(1);

      const result = await getTagList(1, 10);

      expect(result).toEqual({ data: mockData, total: 1 });
      expect(prisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdBy: mockUser.id },
          skip: 0,
          take: 10,
          orderBy: { jobs: { _count: "desc" } },
        }),
      );
    });

    it("should calculate skip correctly for page 2", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.tag.findMany as any).mockResolvedValue([]);
      (prisma.tag.count as any).mockResolvedValue(0);

      await getTagList(2, 10);

      expect(prisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getTagList(1, 10);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.tag.findMany as any).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getTagList(1, 10);

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // createTag
  describe("createTag", () => {
    it("should upsert and return the tag on success", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.tag.upsert as any).mockResolvedValue(mockTag);

      const result = await createTag("React");

      expect(result).toEqual({ data: mockTag, success: true });
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: { value_createdBy: { value: "react", createdBy: mockUser.id } },
        update: {},
        create: { label: "React", value: "react", createdBy: mockUser.id },
      });
    });

    it("should trim label and lowercase the value", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.tag.upsert as any).mockResolvedValue(mockTag);

      await createTag("  React  ");

      expect(prisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ label: "React", value: "react" }),
        }),
      );
    });

    it("should return error for empty label", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const result = await createTag("   ");

      expect(result).toEqual({
        success: false,
        message: "Tag label cannot be empty.",
      });
      expect(prisma.tag.upsert).not.toHaveBeenCalled();
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await createTag("React");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.tag.upsert).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.tag.upsert as any).mockRejectedValue(new Error("DB error"));

      const result = await createTag("React");

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // deleteTagById
  describe("deleteTagById", () => {
    it("should delete a tag that has no linked jobs or questions", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.question.count as any).mockResolvedValue(0);
      (prisma.tag.delete as any).mockResolvedValue(mockTag);

      const result = await deleteTagById("tag-1");

      expect(result).toEqual({ res: mockTag, success: true });
      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: "tag-1", createdBy: mockUser.id },
      });
    });

    it("should return error when tag is linked to jobs only", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(3);
      (prisma.question.count as any).mockResolvedValue(0);

      const result = await deleteTagById("tag-1");

      expect(result).toEqual({
        success: false,
        message:
          "Skill tag cannot be deleted because it is linked to 3 job(s).",
      });
      expect(prisma.tag.delete).not.toHaveBeenCalled();
    });

    it("should return error when tag is linked to questions only", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.question.count as any).mockResolvedValue(5);

      const result = await deleteTagById("tag-1");

      expect(result).toEqual({
        success: false,
        message:
          "Skill tag cannot be deleted because it is linked to 5 question(s).",
      });
      expect(prisma.tag.delete).not.toHaveBeenCalled();
    });

    it("should return error when tag is linked to both jobs and questions", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(2);
      (prisma.question.count as any).mockResolvedValue(4);

      const result = await deleteTagById("tag-1");

      expect(result).toEqual({
        success: false,
        message:
          "Skill tag cannot be deleted because it is linked to 2 job(s) and 4 question(s).",
      });
      expect(prisma.tag.delete).not.toHaveBeenCalled();
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteTagById("tag-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.job.count).not.toHaveBeenCalled();
      expect(prisma.question.count).not.toHaveBeenCalled();
      expect(prisma.tag.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors during deletion", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.question.count as any).mockResolvedValue(0);
      (prisma.tag.delete as any).mockRejectedValue(new Error("DB error"));

      const result = await deleteTagById("tag-1");

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });
});
