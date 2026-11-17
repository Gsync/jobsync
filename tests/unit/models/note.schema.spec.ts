import { NoteFormSchema } from "@/models/note.schema";

describe("NoteFormSchema", () => {
  describe("valid data", () => {
    it("should accept valid note data", () => {
      const data = { jobId: "job-123", content: "Some note content" };
      const result = NoteFormSchema.parse(data);
      expect(result.jobId).toBe("job-123");
      expect(result.content).toBe("Some note content");
    });

    it("should accept data with optional id for editing", () => {
      const data = {
        id: "note-123",
        jobId: "job-123",
        content: "Updated content",
      };
      const result = NoteFormSchema.parse(data);
      expect(result.id).toBe("note-123");
    });

    it("should accept HTML content from rich text editor", () => {
      const data = {
        jobId: "job-123",
        content: "<p>Interview prep: <strong>focus on system design</strong></p>",
      };
      const result = NoteFormSchema.parse(data);
      expect(result.content).toContain("<strong>");
    });

    it("should accept minimal content (1 character)", () => {
      const data = { jobId: "job-123", content: "x" };
      const result = NoteFormSchema.parse(data);
      expect(result.content).toBe("x");
    });
  });

  describe("invalid data", () => {
    it("should reject empty content", () => {
      const data = { jobId: "job-123", content: "" };
      expect(() => NoteFormSchema.parse(data)).toThrow();
    });

    it("should reject missing jobId", () => {
      const data = { content: "Some content" };
      expect(() => NoteFormSchema.parse(data)).toThrow();
    });

    it("should reject missing content", () => {
      const data = { jobId: "job-123" };
      expect(() => NoteFormSchema.parse(data)).toThrow();
    });

    it("should reject empty object", () => {
      expect(() => NoteFormSchema.parse({})).toThrow();
    });
  });
});
