import {
  removeHtmlTags,
  normalizeWhitespace,
  normalizeBullets,
  normalizeHeadings,
  extractMetadata,
  validateText,
} from "@/lib/ai/tools/text-processing";

describe("removeHtmlTags", () => {
  it("returns empty string for undefined input", () => {
    expect(removeHtmlTags(undefined)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(removeHtmlTags("")).toBe("");
  });

  it("converts <li> tags to bullet points", () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const result = removeHtmlTags(html);
    expect(result).toContain("• Item 1");
    expect(result).toContain("• Item 2");
  });

  it("converts closing block tags to newlines", () => {
    const html = "<p>Paragraph 1</p><p>Paragraph 2</p>";
    const result = removeHtmlTags(html);
    expect(result).toContain("Paragraph 1");
    expect(result).toContain("Paragraph 2");
  });

  it("converts <br> tags to newlines", () => {
    const html = "Line 1<br>Line 2<br/>Line 3<br />Line 4";
    const result = removeHtmlTags(html);
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
    expect(result).toContain("Line 3");
    expect(result).toContain("Line 4");
  });

  it("strips remaining HTML tags", () => {
    const html = "<strong>Bold</strong> and <em>italic</em> text";
    const result = removeHtmlTags(html);
    expect(result).toBe("Bold and italic text");
  });

  it("collapses multiple whitespace into single space", () => {
    const html = "<div>   lots   of   spaces   </div>";
    const result = removeHtmlTags(html);
    expect(result).not.toContain("   ");
  });

  it("handles nested HTML tags", () => {
    const html =
      '<div class="job"><p><strong>Title:</strong> Engineer</p></div>';
    const result = removeHtmlTags(html);
    expect(result).toContain("Title:");
    expect(result).toContain("Engineer");
    expect(result).not.toContain("<");
  });

  it("handles li tags with attributes", () => {
    const html = '<li class="item" id="1">Content</li>';
    const result = removeHtmlTags(html);
    expect(result).toContain("• Content");
  });
});

describe("normalizeWhitespace", () => {
  it("converts Windows line endings to Unix", () => {
    expect(normalizeWhitespace("line1\r\nline2")).toBe("line1\nline2");
  });

  it("converts old Mac line endings to Unix", () => {
    expect(normalizeWhitespace("line1\rline2")).toBe("line1\nline2");
  });

  it("collapses multiple spaces and tabs to single space", () => {
    expect(normalizeWhitespace("word1   \t  word2")).toBe("word1 word2");
  });

  it("collapses 3+ consecutive newlines to double newline", () => {
    expect(normalizeWhitespace("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("preserves double newlines", () => {
    expect(normalizeWhitespace("a\n\nb")).toBe("a\n\nb");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });

  it("handles mixed line endings", () => {
    const input = "line1\r\nline2\rline3\nline4";
    const result = normalizeWhitespace(input);
    expect(result).toBe("line1\nline2\nline3\nline4");
  });
});

describe("normalizeBullets", () => {
  it("converts various bullet characters to standard bullet", () => {
    const bullets = ["●", "○", "◦", "▪", "▸", "►", "◆", "★", "✦", "✓", "✔", "→", "‣", "⁃"];
    bullets.forEach((bullet) => {
      expect(normalizeBullets(`${bullet} item`)).toBe("• item");
    });
  });

  it("converts dash bullets at start of line", () => {
    expect(normalizeBullets("- item 1\n- item 2")).toBe(
      "• item 1\n• item 2"
    );
  });

  it("converts en-dash and em-dash bullets at start of line", () => {
    expect(normalizeBullets("– item")).toBe("• item");
    expect(normalizeBullets("— item")).toBe("• item");
  });

  it("converts asterisk bullets at start of line", () => {
    expect(normalizeBullets("* item 1\n* item 2")).toBe(
      "• item 1\n• item 2"
    );
  });

  it("does not convert dashes in the middle of text", () => {
    expect(normalizeBullets("well-known framework")).toBe(
      "well-known framework"
    );
  });

  it("does not convert asterisks in the middle of text", () => {
    expect(normalizeBullets("5*3=15")).toBe("5*3=15");
  });
});

describe("normalizeHeadings", () => {
  it("normalizes all-caps headings with surrounding newlines", () => {
    const result = normalizeHeadings("WORK EXPERIENCE");
    expect(result).toContain("\nWORK EXPERIENCE\n");
  });

  it("normalizes headings with trailing colon", () => {
    const result = normalizeHeadings("EDUCATION:");
    expect(result).toContain("\nEDUCATION\n");
  });

  it("normalizes headings with ampersand", () => {
    const result = normalizeHeadings("SKILLS & TOOLS");
    expect(result).toContain("\nSKILLS & TOOLS\n");
  });

  it("does not affect mixed-case text", () => {
    const input = "This is a regular sentence";
    expect(normalizeHeadings(input)).toBe(input);
  });

  it("does not affect single lowercase word", () => {
    const input = "hello";
    expect(normalizeHeadings(input)).toBe(input);
  });

  it("collapses excessive newlines after normalization", () => {
    const input = "SECTION ONE\n\n\n\nSECTION TWO";
    const result = normalizeHeadings(input);
    expect(result).not.toContain("\n\n\n");
  });
});

describe("extractMetadata", () => {
  it("returns correct character count", () => {
    const result = extractMetadata("hello");
    expect(result.characterCount).toBe(5);
  });

  it("returns correct word count", () => {
    const result = extractMetadata("one two three four");
    expect(result.wordCount).toBe(4);
  });

  it("returns correct line count", () => {
    const result = extractMetadata("line1\nline2\nline3");
    expect(result.lineCount).toBe(3);
  });

  it("filters out empty words from count", () => {
    const result = extractMetadata("  spaced   out  ");
    expect(result.wordCount).toBe(2);
  });

  it("detects email as contact info", () => {
    const result = extractMetadata("Contact me at john@example.com");
    expect(result.hasContactInfo).toBe(true);
  });

  it("detects phone number as contact info", () => {
    const result = extractMetadata("Call me at (403) 555-1234");
    expect(result.hasContactInfo).toBe(true);
  });

  it("detects phone number without parens", () => {
    const result = extractMetadata("Phone: 403-555-1234");
    expect(result.hasContactInfo).toBe(true);
  });

  it("detects phone number with dots", () => {
    const result = extractMetadata("Phone: 403.555.1234");
    expect(result.hasContactInfo).toBe(true);
  });

  it("returns false for no contact info", () => {
    const result = extractMetadata("Just a regular sentence with no contacts");
    expect(result.hasContactInfo).toBe(false);
  });

  it("handles empty string", () => {
    const result = extractMetadata("");
    expect(result.characterCount).toBe(0);
    expect(result.wordCount).toBe(0);
    expect(result.lineCount).toBe(1);
    expect(result.hasContactInfo).toBe(false);
  });
});

describe("validateText", () => {
  const validText = "a".repeat(300);

  it("returns valid for text within bounds", () => {
    const result = validateText(validText);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns NO_CONTENT for empty string", () => {
    const result = validateText("");
    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("NO_CONTENT");
  });

  it("returns NO_CONTENT for whitespace-only string", () => {
    const result = validateText("   \n\t  ");
    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("NO_CONTENT");
  });

  it("returns TOO_SHORT when below minimum", () => {
    const result = validateText("short", 200);
    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("TOO_SHORT");
    expect(result.error?.details).toEqual({
      characterCount: 5,
      minCharCount: 200,
    });
  });

  it("returns TOO_LONG when above maximum", () => {
    const longText = "a".repeat(60000);
    const result = validateText(longText, 200, 50000);
    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("TOO_LONG");
    expect(result.error?.details).toEqual({
      characterCount: 60000,
      maxCharCount: 50000,
    });
  });

  it("returns CORRUPTED for excessive consecutive special characters", () => {
    const corrupted = "normal text " + "!@#$%^&*()".repeat(5) + " more text";
    const result = validateText(corrupted, 10, 50000);
    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe("CORRUPTED");
  });

  it("allows special characters under the threshold", () => {
    const text = "normal text !@#$% more text " + "a".repeat(200);
    const result = validateText(text, 10, 50000);
    expect(result.isValid).toBe(true);
  });

  it("uses custom context label in error messages", () => {
    const result = validateText("", 200, 50000, "Resume");
    expect(result.error?.message).toContain("Resume");
  });

  it("uses default context label when not provided", () => {
    const result = validateText("");
    expect(result.error?.message).toContain("Content");
  });

  it("respects custom min and max values", () => {
    const result = validateText("hello", 3, 10);
    expect(result.isValid).toBe(true);
  });

  it("exactly at minimum length is valid", () => {
    const text = "a".repeat(200);
    const result = validateText(text, 200);
    expect(result.isValid).toBe(true);
  });

  it("exactly at maximum length is valid", () => {
    const text = "a".repeat(50000);
    const result = validateText(text, 200, 50000);
    expect(result.isValid).toBe(true);
  });
});
