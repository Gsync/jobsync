import { CoverLetterFormSchema } from "@/models/coverLetterForm.schema";

describe("CoverLetterFormSchema", () => {
  describe("valid data", () => {
    it("should accept valid cover letter data", () => {
      const data = {
        title: "Software Engineer Cover Letter",
        content: "Dear Hiring Manager, I am writing to apply...",
      };
      const result = CoverLetterFormSchema.parse(data);
      expect(result.title).toBe("Software Engineer Cover Letter");
      expect(result.content).toBe(
        "Dear Hiring Manager, I am writing to apply...",
      );
    });

    it("should accept data with optional id for editing", () => {
      const data = {
        id: "cl-123",
        title: "My Cover Letter",
        content: "This is my cover letter content.",
      };
      const result = CoverLetterFormSchema.parse(data);
      expect(result.id).toBe("cl-123");
    });

    it("should accept HTML content from rich text editor", () => {
      const data = {
        title: "Cover Letter",
        content:
          "<p>Dear Manager, <strong>I am excited</strong> to apply.</p>",
      };
      const result = CoverLetterFormSchema.parse(data);
      expect(result.content).toContain("<strong>");
    });

    it("should accept title at max length (100 characters)", () => {
      const data = {
        title: "A".repeat(100),
        content: "Valid content for the cover letter.",
      };
      const result = CoverLetterFormSchema.parse(data);
      expect(result.title).toHaveLength(100);
    });

    it("should accept content at minimum length (10 characters)", () => {
      const data = {
        title: "Title",
        content: "A".repeat(10),
      };
      const result = CoverLetterFormSchema.parse(data);
      expect(result.content).toHaveLength(10);
    });
  });

  describe("invalid data", () => {
    it("should reject empty title", () => {
      const data = { title: "", content: "Valid content for cover letter." };
      expect(() => CoverLetterFormSchema.parse(data)).toThrow();
    });

    it("should reject title exceeding 100 characters", () => {
      const data = {
        title: "A".repeat(101),
        content: "Valid content for cover letter.",
      };
      expect(() => CoverLetterFormSchema.parse(data)).toThrow();
    });

    it("should reject content shorter than 10 characters", () => {
      const data = { title: "Title", content: "Short" };
      expect(() => CoverLetterFormSchema.parse(data)).toThrow();
    });

    it("should reject missing title", () => {
      const data = { content: "Valid content for cover letter." };
      expect(() => CoverLetterFormSchema.parse(data)).toThrow();
    });

    it("should reject missing content", () => {
      const data = { title: "Title" };
      expect(() => CoverLetterFormSchema.parse(data)).toThrow();
    });

    it("should reject empty object", () => {
      expect(() => CoverLetterFormSchema.parse({})).toThrow();
    });
  });
});
