import {
  countWords,
  classifyDescriptionCompleteness,
} from "@/lib/jobs/descriptionCompleteness";

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("one two three")).toBe(3);
  });

  it("ignores runs of whitespace, newlines and padding", () => {
    expect(countWords("  one \n\n two\t three  ")).toBe(3);
  });

  it("returns 0 for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n ")).toBe(0);
  });
});

describe("classifyDescriptionCompleteness", () => {
  it("classifies a stub as title-only", () => {
    expect(classifyDescriptionCompleteness(words(39))).toBe("title-only");
  });

  it("classifies a mid-length description as partial", () => {
    expect(classifyDescriptionCompleteness(words(40))).toBe("partial");
    expect(classifyDescriptionCompleteness(words(149))).toBe("partial");
  });

  it("classifies a full posting as full", () => {
    expect(classifyDescriptionCompleteness(words(150))).toBe("full");
    expect(classifyDescriptionCompleteness(words(600))).toBe("full");
  });

  it("treats empty input as title-only", () => {
    expect(classifyDescriptionCompleteness("")).toBe("title-only");
  });
});
