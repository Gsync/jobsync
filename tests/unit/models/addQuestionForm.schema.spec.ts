import { AddQuestionFormSchema } from "@/models/addQuestionForm.schema";

describe("AddQuestionFormSchema", () => {
  describe("valid data", () => {
    it("should accept valid question with all fields", () => {
      const data = {
        question: "What is React?",
        answer: "A JavaScript library for building UIs.",
        tagIds: ["tag-1", "tag-2"],
      };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.question).toBe("What is React?");
      expect(result.answer).toBe("A JavaScript library for building UIs.");
      expect(result.tagIds).toEqual(["tag-1", "tag-2"]);
    });

    it("should accept question without tagIds", () => {
      const data = {
        question: "What is React?",
        answer: "A JavaScript library for building UIs.",
      };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.tagIds).toBeUndefined();
    });

    it("should accept empty tagIds array", () => {
      const data = {
        question: "What is React?",
        answer: "A JavaScript library for building UIs.",
        tagIds: [],
      };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.tagIds).toEqual([]);
    });

    it("should accept optional id for editing", () => {
      const data = {
        id: "q-123",
        question: "Updated question?",
        answer: "A JavaScript library for building UIs.",
      };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.id).toBe("q-123");
    });

    it("should accept minimum length question (5 chars)", () => {
      const data = {
        question: "abcde",
        answer: "A JavaScript library for building UIs.",
      };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.question).toBe("abcde");
    });

    it("should accept minimum length answer (10 chars)", () => {
      const data = { question: "What is React?", answer: "1234567890" };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.answer).toBe("1234567890");
    });

    it("should accept up to 10 tags", () => {
      const tagIds = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
      const data = {
        question: "What is React?",
        answer: "A JavaScript library for building UIs.",
        tagIds,
      };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.tagIds).toHaveLength(10);
    });
  });

  describe("invalid data", () => {
    it("should reject question shorter than 5 characters", () => {
      const data = { question: "ab", answer: "1234567890" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject empty question", () => {
      const data = { question: "", answer: "1234567890" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject missing question", () => {
      const data = { answer: "1234567890" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject missing answer", () => {
      const data = { question: "What is React?" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject null answer", () => {
      const data = { question: "What is React?", answer: null };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject answer shorter than 10 characters", () => {
      const data = { question: "What is React?", answer: "short" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject answer exceeding 5000 characters", () => {
      const data = { question: "What?", answer: "x".repeat(5001) };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject more than 10 tags", () => {
      const tagIds = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
      const data = { question: "What?", answer: "1234567890", tagIds };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject empty object", () => {
      expect(() => AddQuestionFormSchema.parse({})).toThrow();
    });
  });
});
