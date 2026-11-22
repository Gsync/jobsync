import { handleAddQuestionsBatch } from "@/lib/mcp/tools/addQuestionsBatch";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import type { SaveQuestionResult } from "@/models/question.model";

vi.mock("@/lib/questions/saveQuestions", () => ({ saveQuestions: vi.fn() }));

vi.mock("@/lib/mcp/rate-limit", () => ({ checkMcpRateLimit: vi.fn() }));

const questions = [
  { question: "Tell me about yourself." },
  { question: "How do you handle a failing deploy?" },
  { question: "Why Postgres over Mongo?" },
];

const saved = (index: number): SaveQuestionResult => ({
  index,
  question: questions[index - 1].question,
  status: "saved",
  tags: [],
  droppedTags: [],
});

const allow = { allowed: true, remaining: 99, resetIn: 0 };
const deny = { allowed: false, remaining: 0, resetIn: 30_000 };

describe("handleAddQuestionsBatch", () => {
  it("sends the whole list to saveQuestions in one call", async () => {
    vi.mocked(checkMcpRateLimit).mockReturnValue(allow);
    vi.mocked(saveQuestions).mockResolvedValue([saved(1), saved(2), saved(3)]);

    await handleAddQuestionsBatch({ questions }, "user-1", "Claude Desktop");

    expect(saveQuestions).toHaveBeenCalledTimes(1);
    expect(saveQuestions).toHaveBeenCalledWith(questions, "user-1", {
      createdVia: "Claude Desktop",
      replaceAgentCreatedOnly: true,
    });
    expect(checkMcpRateLimit).toHaveBeenCalledTimes(3);
  });

  it("indexes results 1..n and labels each line", async () => {
    vi.mocked(checkMcpRateLimit).mockReturnValue(allow);
    vi.mocked(saveQuestions).mockResolvedValue([
      saved(1),
      { index: 2, question: questions[1].question, status: "repeat", of: 1 },
      saved(3),
    ]);

    const out = await handleAddQuestionsBatch({ questions }, "user-1", "Claude Desktop");
    const results = out.structuredContent!.results as Array<{ index: number }>;
    const text = out.content[0].text;

    expect(results.map((r) => r.index)).toEqual([1, 2, 3]);
    expect(results[1]).toMatchObject({ status: "repeat", of: 1 });
    expect(text).toContain("[1/3] Tell me about yourself.: Question created.");
    expect(text).toContain("[2/3] How do you handle a failing deploy?: ");
    expect(text.indexOf("[1/3]")).toBeLessThan(text.indexOf("[3/3]"));
  });

  it("saves only the allowed prefix when the rate limit runs out", async () => {
    vi.mocked(checkMcpRateLimit).mockReturnValueOnce(allow).mockReturnValue(deny);
    vi.mocked(saveQuestions).mockResolvedValue([saved(1)]);

    const out = await handleAddQuestionsBatch({ questions }, "user-1", "Claude Desktop");
    const results = out.structuredContent!.results as unknown[];

    expect(checkMcpRateLimit).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveQuestions).mock.calls[0][0]).toEqual([questions[0]]);
    expect(results[1]).toEqual({ index: 2, skipped: true });
    expect(results[2]).toEqual({ index: 3, skipped: true });
    expect(out.content[0].text).toContain(
      "Stopped after the rate limit — 2 item(s) not attempted. Retry them once the window resets.",
    );
  });

  it("returns the single-tool rate-limit text when no question is allowed", async () => {
    vi.mocked(checkMcpRateLimit).mockReturnValue(deny);

    const out = await handleAddQuestionsBatch({ questions }, "user-1", "Claude Desktop");

    expect(saveQuestions).not.toHaveBeenCalled();
    expect(out.content[0].text).toBe("Rate limit exceeded. Try again in 30s.");
  });
});
