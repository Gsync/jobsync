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

    it("should accept question without answer", () => {
      const data = { question: "What is React?" };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.question).toBe("What is React?");
      expect(result.answer).toBeUndefined();
    });

    it("should accept null answer", () => {
      const data = { question: "What is React?", answer: null };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.answer).toBeNull();
    });

    it("should accept question without tagIds", () => {
      const data = { question: "What is React?" };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.tagIds).toBeUndefined();
    });

    it("should accept empty tagIds array", () => {
      const data = { question: "What is React?", tagIds: [] };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.tagIds).toEqual([]);
    });

    it("should accept optional id for editing", () => {
      const data = { id: "q-123", question: "Updated question?" };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.id).toBe("q-123");
    });

    it("should accept minimum length question (2 chars)", () => {
      const data = { question: "ab" };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.question).toBe("ab");
    });

    it("should accept up to 10 tags", () => {
      const tagIds = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
      const data = { question: "What is React?", tagIds };
      const result = AddQuestionFormSchema.parse(data);
      expect(result.tagIds).toHaveLength(10);
    });
  });

  describe("invalid data", () => {
    it("should reject question shorter than 2 characters", () => {
      const data = { question: "a" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject empty question", () => {
      const data = { question: "" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject missing question", () => {
      const data = { answer: "Some answer" };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject answer exceeding 5000 characters", () => {
      const data = { question: "What?", answer: "x".repeat(5001) };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject more than 10 tags", () => {
      const tagIds = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
      const data = { question: "What?", tagIds };
      expect(() => AddQuestionFormSchema.parse(data)).toThrow();
    });

    it("should reject empty object", () => {
      expect(() => AddQuestionFormSchema.parse({})).toThrow();
    });
  });
});
