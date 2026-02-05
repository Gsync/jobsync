import {
  formatUrl,
  formatElapsedTime,
  combineDateAndTime,
  calculatePercentageDifference,
  getLast7Days,
  getTimestampedFileName,
} from "@/lib/utils";

describe("formatUrl", () => {
  it("prepends https:// to bare domain", () => {
    expect(formatUrl("example.com")).toBe("https://example.com");
  });

  it("leaves http:// URL unchanged", () => {
    expect(formatUrl("http://example.com")).toBe("http://example.com");
  });

  it("leaves https:// URL unchanged", () => {
    expect(formatUrl("https://example.com")).toBe("https://example.com");
  });

  it("handles URL with path", () => {
    expect(formatUrl("example.com/jobs/123")).toBe(
      "https://example.com/jobs/123"
    );
  });

  it("handles URL with query parameters", () => {
    expect(formatUrl("example.com?q=test")).toBe("https://example.com?q=test");
  });

  it("handles URL with subdomain", () => {
    expect(formatUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("handles URL with port", () => {
    expect(formatUrl("example.com:3000")).toBe("https://example.com:3000");
  });
});

describe("formatElapsedTime", () => {
  it("formats seconds only", () => {
    expect(formatElapsedTime(30000)).toBe("0m 30s");
  });

  it("formats minutes and seconds", () => {
    expect(formatElapsedTime(90000)).toBe("1m 30s");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatElapsedTime(3661000)).toBe("1h 1m 1s");
  });

  it("formats zero milliseconds", () => {
    expect(formatElapsedTime(0)).toBe("0m 0s");
  });

  it("omits hours when zero", () => {
    expect(formatElapsedTime(60000)).toBe("1m 0s");
    expect(formatElapsedTime(60000)).not.toContain("h");
  });

  it("includes hours when non-zero", () => {
    expect(formatElapsedTime(3600000)).toBe("1h 0m 0s");
  });

  it("formats multiple hours correctly", () => {
    expect(formatElapsedTime(7200000)).toBe("2h 0m 0s");
  });

  it("handles large durations (8 hours)", () => {
    expect(formatElapsedTime(28800000)).toBe("8h 0m 0s");
  });

  it("floors partial seconds", () => {
    expect(formatElapsedTime(1500)).toBe("0m 1s");
  });
});

describe("combineDateAndTime", () => {
  it("combines date and morning time", () => {
    const date = new Date(2025, 0, 15);
    const result = combineDateAndTime(date, "09:30 AM");
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it("combines date and afternoon time", () => {
    const date = new Date(2025, 5, 20);
    const result = combineDateAndTime(date, "02:45 PM");
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(45);
  });

  it("handles 12:00 AM (midnight)", () => {
    const date = new Date(2025, 0, 1);
    const result = combineDateAndTime(date, "12:00 AM");
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("handles 12:00 PM (noon)", () => {
    const date = new Date(2025, 0, 1);
    const result = combineDateAndTime(date, "12:00 PM");
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });

  it("preserves the date portion", () => {
    const date = new Date(2025, 11, 31);
    const result = combineDateAndTime(date, "11:59 PM");
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });
});

describe("calculatePercentageDifference", () => {
  it("returns 0 when both values are 0", () => {
    expect(calculatePercentageDifference(0, 0)).toBe(0);
  });

  it("returns 100 when first value is 0 and second is positive", () => {
    expect(calculatePercentageDifference(0, 5)).toBe(100);
  });

  it("returns 100 when first value is 0 and second is negative", () => {
    expect(calculatePercentageDifference(0, -5)).toBe(100);
  });

  it("calculates positive percentage increase", () => {
    expect(calculatePercentageDifference(10, 15)).toBe(50);
  });

  it("calculates negative percentage decrease", () => {
    expect(calculatePercentageDifference(10, 5)).toBe(-50);
  });

  it("returns 0 when both values are equal", () => {
    expect(calculatePercentageDifference(10, 10)).toBe(0);
  });

  it("returns 100 for doubling", () => {
    expect(calculatePercentageDifference(5, 10)).toBe(100);
  });

  it("returns -100 for going to zero", () => {
    expect(calculatePercentageDifference(10, 0)).toBe(-100);
  });

  it("rounds to nearest integer", () => {
    expect(calculatePercentageDifference(3, 4)).toBe(33);
  });

  it("handles negative base value", () => {
    const result = calculatePercentageDifference(-10, -5);
    expect(result).toBe(50);
  });
});

describe("getLast7Days", () => {
  it("returns 7 dates", () => {
    const result = getLast7Days();
    expect(result).toHaveLength(7);
  });

  it("returns dates in chronological order using a base date", () => {
    const baseDate = new Date(2025, 0, 10);
    const result = getLast7Days("yyyy-MM-dd", baseDate);
    expect(result).toEqual([
      "2025-01-04",
      "2025-01-05",
      "2025-01-06",
      "2025-01-07",
      "2025-01-08",
      "2025-01-09",
      "2025-01-10",
    ]);
  });

  it("last date is the base date", () => {
    const baseDate = new Date(2025, 0, 15);
    const result = getLast7Days("yyyy-MM-dd", baseDate);
    expect(result[6]).toBe("2025-01-15");
  });

  it("first date is 6 days before the base date", () => {
    const baseDate = new Date(2025, 0, 15);
    const result = getLast7Days("yyyy-MM-dd", baseDate);
    expect(result[0]).toBe("2025-01-09");
  });

  it("handles month boundary", () => {
    const baseDate = new Date(2025, 1, 2);
    const result = getLast7Days("yyyy-MM-dd", baseDate);
    expect(result[0]).toBe("2025-01-27");
    expect(result[6]).toBe("2025-02-02");
  });

  it("handles year boundary", () => {
    const baseDate = new Date(2025, 0, 3);
    const result = getLast7Days("yyyy-MM-dd", baseDate);
    expect(result[0]).toBe("2024-12-28");
    expect(result[6]).toBe("2025-01-03");
  });

  it("uses custom date format", () => {
    const baseDate = new Date(2025, 0, 10);
    const result = getLast7Days("MMM d", baseDate);
    expect(result[6]).toBe("Jan 10");
  });
});

describe("getTimestampedFileName", () => {
  it("appends timestamp to filename", () => {
    const result = getTimestampedFileName("resume.pdf");
    expect(result).toMatch(/^resume_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/);
  });

  it("preserves the file extension", () => {
    const result = getTimestampedFileName("document.docx");
    expect(result).toMatch(/\.docx$/);
  });

  it("preserves the base name", () => {
    const result = getTimestampedFileName("my-resume.pdf");
    expect(result).toMatch(/^my-resume_/);
  });

  it("handles files with multiple dots", () => {
    const result = getTimestampedFileName("file.name.txt");
    expect(result).toMatch(/\.txt$/);
  });

  it("replaces colons with dashes in timestamp for file system compatibility", () => {
    const result = getTimestampedFileName("test.pdf");
    expect(result).not.toContain(":");
  });

  it("removes milliseconds from timestamp", () => {
    const result = getTimestampedFileName("test.pdf");
    const timestampPart = result.replace("test_", "").replace(".pdf", "");
    expect(timestampPart).not.toContain(".");
  });
});
