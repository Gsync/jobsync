import { createQuestionFromNames } from "@/lib/questions/createQuestionFromNames";
import { resolveTags } from "@/lib/jobs/resolve";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    question: { create: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/jobs/resolve", () => ({
  resolveTags: vi.fn(),
}));

describe("createQuestionFromNames", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (resolveTags as any).mockResolvedValue({ resolved: [], dropped: [] });
    (prisma.question.create as any).mockResolvedValue({ id: "question-1" });
  });

  it("converts the markdown answer to HTML before storing", async () => {
    await createQuestionFromNames(
      { question: "What is closures?", answer: "**bold** answer" },
      userId,
    );

    expect(prisma.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          answer: expect.stringContaining("<strong>bold</strong>"),
        }),
      }),
    );
  });

  it("does not render raw HTML tags in the markdown input (html:false)", async () => {
    await createQuestionFromNames(
      { question: "XSS?", answer: "<script>alert(1)</script>" },
      userId,
    );

    const data = (prisma.question.create as any).mock.calls[0][0].data;
    expect(data.answer).not.toContain("<script>");
  });

  it("connects resolved tags and sets createdVia", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [{ id: "tag-1", label: "React", created: false }],
      dropped: [],
    });

    await createQuestionFromNames(
      { question: "Q?", answer: "A", tags: ["React"], createdVia: "my-token" },
      userId,
    );

    expect(prisma.question.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdBy: userId,
        createdVia: "my-token",
        tags: { connect: [{ id: "tag-1" }] },
      }),
    });
  });

  it("builds a success message describing matched/created resolutions", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [
        { id: "tag-1", label: "React", created: false },
        { id: "tag-2", label: "Hooks", created: true },
      ],
      dropped: [],
    });

    const result = await createQuestionFromNames(
      { question: "Q?", answer: "A", tags: ["React", "Hooks"] },
      userId,
    );

    expect(result.message).toBe(
      "Matched React; Created Hooks. Question created (id: question-1).",
    );
  });

  it("appends dropped tags to the message when tags exceed the limit", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [],
      dropped: ["Extra1", "Extra2"],
    });

    const result = await createQuestionFromNames(
      { question: "Q?", answer: "A" },
      userId,
    );

    expect(result.message).toContain("Dropped tags exceeding limit: Extra1, Extra2.");
  });

  it("omits the resolutions clause from the message when there are no tags", async () => {
    const result = await createQuestionFromNames(
      { question: "Q?", answer: "A" },
      userId,
    );

    expect(result.message).toBe("Question created (id: question-1).");
  });
});
