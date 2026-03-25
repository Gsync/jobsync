import {
  getQuestionsList,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTagsWithQuestionCounts,
} from "@/actions/question.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    question: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

describe("Question Actions", () => {
  const mockUser = { id: "user-id" };

  const mockQuestion = {
    id: "q-1",
    question: "What is React?",
    answer: "<p>A JS library</p>",
    createdBy: mockUser.id,
    tags: [{ id: "tag-1", label: "React", value: "react" }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // getQuestionsList
  describe("getQuestionsList", () => {
    it("should return paginated questions", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([mockQuestion]);
      (prisma.question.count as jest.Mock).mockResolvedValue(1);

      const result = await getQuestionsList(1, 10);

      expect(result).toEqual({ success: true, data: [mockQuestion], total: 1 });
      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdBy: mockUser.id },
          skip: 0,
          take: 10,
          orderBy: [{ createdAt: "desc" }],
          include: { tags: true },
        }),
      );
    });

    it("should calculate offset for page 2", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.question.count as jest.Mock).mockResolvedValue(0);

      await getQuestionsList(2, 10);

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it("should filter by tag when filter is provided", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.question.count as jest.Mock).mockResolvedValue(0);

      await getQuestionsList(1, 10, "tag-1");

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdBy: mockUser.id,
            tags: { some: { id: "tag-1" } },
          },
        }),
      );
    });

    it("should search by question and answer content", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.question.count as jest.Mock).mockResolvedValue(0);

      await getQuestionsList(1, 10, undefined, "react");

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdBy: mockUser.id,
            OR: [
              { question: { contains: "react" } },
              { answer: { contains: "react" } },
            ],
          },
        }),
      );
    });

    it("should apply both filter and search together", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.question.count as jest.Mock).mockResolvedValue(0);

      await getQuestionsList(1, 10, "tag-1", "react");

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdBy: mockUser.id,
            tags: { some: { id: "tag-1" } },
            OR: [
              { question: { contains: "react" } },
              { answer: { contains: "react" } },
            ],
          },
        }),
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getQuestionsList(1, 10);

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.question.findMany).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findMany as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getQuestionsList(1, 10);

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // getQuestionById
  describe("getQuestionById", () => {
    it("should return question by id", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findFirst as jest.Mock).mockResolvedValue(mockQuestion);

      const result = await getQuestionById("q-1");

      expect(result).toEqual({ success: true, data: mockQuestion });
      expect(prisma.question.findFirst).toHaveBeenCalledWith({
        where: { id: "q-1", createdBy: mockUser.id },
        include: { tags: true },
      });
    });

    it("should return not found when question does not exist", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getQuestionById("nonexistent");

      expect(result).toEqual({
        success: false,
        message: "Question not found",
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getQuestionById("q-1");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.question.findFirst).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.findFirst as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getQuestionById("q-1");

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // createQuestion
  describe("createQuestion", () => {
    it("should create a question with tags", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.create as jest.Mock).mockResolvedValue(mockQuestion);

      const result = await createQuestion({
        question: "What is React?",
        answer: "<p>A JS library</p>",
        tagIds: ["tag-1"],
      });

      expect(result).toEqual({ success: true, data: mockQuestion });
      expect(prisma.question.create).toHaveBeenCalledWith({
        data: {
          question: "What is React?",
          answer: "<p>A JS library</p>",
          createdBy: mockUser.id,
          tags: { connect: [{ id: "tag-1" }] },
        },
        include: { tags: true },
      });
    });

    it("should create a question without tags", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.create as jest.Mock).mockResolvedValue({
        ...mockQuestion,
        tags: [],
      });

      const result = await createQuestion({
        question: "What is React?",
      });

      expect(result?.success).toBe(true);
      expect(prisma.question.create).toHaveBeenCalledWith({
        data: {
          question: "What is React?",
          answer: null,
          createdBy: mockUser.id,
          tags: undefined,
        },
        include: { tags: true },
      });
    });

    it("should create a question with null answer", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.create as jest.Mock).mockResolvedValue(mockQuestion);

      await createQuestion({ question: "What?", answer: null });

      expect(prisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ answer: null }),
        }),
      );
    });

    it("should reject invalid data (question too short)", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await createQuestion({ question: "a" });

      expect(result?.success).toBe(false);
      expect(prisma.question.create).not.toHaveBeenCalled();
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await createQuestion({ question: "What is React?" });

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.question.create).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.create as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await createQuestion({ question: "What is React?" });

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // updateQuestion
  describe("updateQuestion", () => {
    it("should update a question with new tags", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.update as jest.Mock).mockResolvedValue(mockQuestion);

      const result = await updateQuestion({
        id: "q-1",
        question: "Updated question?",
        answer: "<p>Updated answer</p>",
        tagIds: ["tag-1", "tag-2"],
      });

      expect(result).toEqual({ success: true, data: mockQuestion });
      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: "q-1", createdBy: mockUser.id },
        data: {
          question: "Updated question?",
          answer: "<p>Updated answer</p>",
          tags: { set: [{ id: "tag-1" }, { id: "tag-2" }] },
        },
        include: { tags: true },
      });
    });

    it("should clear tags when tagIds is empty", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.update as jest.Mock).mockResolvedValue(mockQuestion);

      await updateQuestion({
        id: "q-1",
        question: "Updated?",
        tagIds: [],
      });

      expect(prisma.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { set: [] },
          }),
        }),
      );
    });

    it("should return error when id is missing", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateQuestion({ question: "No ID?" });

      expect(result?.success).toBe(false);
      expect(prisma.question.update).not.toHaveBeenCalled();
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await updateQuestion({
        id: "q-1",
        question: "Updated?",
      });

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.question.update).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.update as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await updateQuestion({
        id: "q-1",
        question: "Updated?",
      });

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // deleteQuestion
  describe("deleteQuestion", () => {
    it("should delete a question", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.delete as jest.Mock).mockResolvedValue(mockQuestion);

      const result = await deleteQuestion("q-1");

      expect(result).toEqual({ success: true });
      expect(prisma.question.delete).toHaveBeenCalledWith({
        where: { id: "q-1", createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await deleteQuestion("q-1");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.question.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.question.delete as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await deleteQuestion("q-1");

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  // getTagsWithQuestionCounts
  describe("getTagsWithQuestionCounts", () => {
    it("should return tags with question counts", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockTags = [
        {
          id: "tag-1",
          label: "React",
          value: "react",
          _count: { questions: 5 },
        },
        {
          id: "tag-2",
          label: "TypeScript",
          value: "typescript",
          _count: { questions: 3 },
        },
      ];
      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prisma.question.count as jest.Mock).mockResolvedValue(8);

      const result = await getTagsWithQuestionCounts();

      expect(result).toEqual({
        success: true,
        data: [
          { id: "tag-1", label: "React", value: "react", questionCount: 5 },
          {
            id: "tag-2",
            label: "TypeScript",
            value: "typescript",
            questionCount: 3,
          },
        ],
        total: 8,
      });
    });

    it("should filter out tags with zero questions", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockTags = [
        {
          id: "tag-1",
          label: "React",
          value: "react",
          _count: { questions: 2 },
        },
        {
          id: "tag-2",
          label: "Unused",
          value: "unused",
          _count: { questions: 0 },
        },
      ];
      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prisma.question.count as jest.Mock).mockResolvedValue(2);

      const result = await getTagsWithQuestionCounts();

      expect(result?.data).toHaveLength(1);
      expect(result?.data[0].label).toBe("React");
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getTagsWithQuestionCounts();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.tag.findMany as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getTagsWithQuestionCounts();

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });
});
