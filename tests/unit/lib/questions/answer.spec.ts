import { hasAnswer, joinAnswerHtml } from "@/lib/questions/answer";

describe("hasAnswer", () => {
  it.each([null, undefined, "", "   ", "TBD", "tbd", "<p>TBD</p>", "<p> </p>"])(
    "%s has no answer",
    (answer) => {
      expect(hasAnswer(answer)).toBe(false);
    },
  );

  it("treats real text as an answer", () => {
    expect(hasAnswer("<p>Roll back first</p>")).toBe(true);
  });
});

describe("joinAnswerHtml", () => {
  it("puts the added answer below the saved one with a separator", () => {
    expect(joinAnswerHtml("<p>a</p>", "<p>b</p>")).toBe("<p>a</p><hr><p>b</p>");
  });
});
