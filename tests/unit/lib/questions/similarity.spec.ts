import {
  matchQuestion,
  normalizeQuestionText,
  trigramSimilarity,
} from "@/lib/questions/similarity";
import type { BankQuestion } from "@/models/question.model";

const row = (id: string, question: string, answer: string | null = "<p>Saved</p>"): BankQuestion => ({
  id,
  question,
  answer,
  createdVia: null,
  tags: [],
});

describe("normalizeQuestionText", () => {
  it("lowercases, collapses whitespace and strips one trailing mark", () => {
    expect(normalizeQuestionText("  Tell me   about YOURSELF?? ")).toBe(
      "tell me about yourself?",
    );
  });

  it("keeps C++ and C# distinct", () => {
    const plus = "How does C++ manage memory?";
    const sharp = "How does C# manage memory?";
    expect(normalizeQuestionText(plus)).not.toBe(normalizeQuestionText(sharp));
    expect(matchQuestion(plus, [row("q-1", sharp)]).exact).toBeUndefined();
  });
});

describe("trigramSimilarity", () => {
  it.each([
    ["How do you handle a failing deploy?", "How do you deal with a broken deployment?", 0.28],
    ["Why do you want to work here?", "Why do you want to leave your job?", 0.45],
  ])("scores %s vs %s", (a, b, expected) => {
    expect(trigramSimilarity(a, b)).toBeCloseTo(expected, 2);
  });

  it("scores identical text 1", () => {
    expect(trigramSimilarity("Tell me about yourself", "Tell me about yourself")).toBe(1);
  });

  it("scores empty against text 0", () => {
    expect(trigramSimilarity("", "abc")).toBe(0);
  });
});

describe("matchQuestion", () => {
  it("returns a saved rewording as a candidate", () => {
    const deploy = row("q-deploy", "How do you deal with a broken deployment?");
    const match = matchQuestion("How do you handle a failing deploy?", [deploy]);
    expect(match.candidates[0].id).toBe(deploy.id);
    expect(match.candidateRows[0]).toBe(deploy);
  });

  it("drops candidates under the floor", () => {
    const match = matchQuestion("What is your greatest weakness?", [
      row("q-1", "What are your strengths?"),
    ]);
    expect(match.candidates).toEqual([]);
  });

  it("keeps the top 3 by score, ties by id", () => {
    const bank = [
      row("q-1", "What is your favourite colour?"),
      row("q-4", "How do you handle a failing build?"),
      row("q-3", "How do you handle a slow deploy?"),
      row("q-2", "How do you handle a failing build?"),
      row("q-5", "How do you handle a failing test?"),
    ];
    const { candidates } = matchQuestion("How do you handle a failing deploy?", bank);
    expect(candidates.map((c) => c.id)).toEqual(["q-5", "q-2", "q-4"]);
    const scores = candidates.map((c) => c.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("takes the first exact row and leaves exact rows out of candidates", () => {
    const bank = [row("q-1", "Tell me about yourself."), row("q-2", "Tell me about yourself")];
    const match = matchQuestion("tell me about yourself", bank);
    expect(match.exact).toBe(bank[0]);
    expect(match.candidates).toEqual([]);
  });

  it("returns no answer text in a candidate", () => {
    const match = matchQuestion("How do you handle a failing deploy?", [
      row("q-1", "How do you handle a failing build?", "<p>TBD</p>"),
    ]);
    expect(Object.keys(match.candidates[0]).sort()).toEqual([
      "hasAnswer",
      "id",
      "question",
      "score",
    ]);
    expect(match.candidates[0].hasAnswer).toBe(false);
  });
});
