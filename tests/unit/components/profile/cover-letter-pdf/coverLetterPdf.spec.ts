import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import type { ContactInfo } from "@/models/profile.model";
import type { HtmlStyleSet } from "@/components/pdf-export/types";
import { defaultCoverLetterExportSettings } from "@/models/coverLetterExport.model";
import { stripEmptyParagraphs } from "@/components/profile/cover-letter-pdf/stripEmptyParagraphs";

const { pdf, toBlob, registerHyphenationCallback, htmlToPdfNodes } = vi.hoisted(
  () => {
    const toBlob = vi.fn(
      async () => new Blob(["%PDF"], { type: "application/pdf" }),
    );
    return {
      toBlob,
      // Typed params, so mock.calls is a tuple tsc can index into.
      pdf: vi.fn((_document: any) => ({ toBlob })),
      registerHyphenationCallback: vi.fn(),
      htmlToPdfNodes: vi.fn(
        (_html: string, _styleSet?: HtmlStyleSet) =>
          [] as React.ReactElement[],
      ),
    };
  },
);

// The real renderer never loads in jsdom; StyleSheet.create is identity so
// letter.styles.ts still returns a plain object tree.
vi.mock("@react-pdf/renderer", () => ({
  pdf,
  Font: { registerHyphenationCallback },
  StyleSheet: { create: (sheet: unknown) => sheet },
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  Link: () => null,
}));

vi.mock("@/components/pdf-export/html-to-pdf", () => ({ htmlToPdfNodes }));

import { generateCoverLetterPdfBlob } from "@/components/profile/cover-letter-pdf/generateCoverLetterPdf";

const contactInfo = {
  firstName: "Ada",
  lastName: "Lovelace",
  headline: "Engineer",
  email: "ada@example.com",
} as ContactInfo;

const generate = (
  letter: { title: string; content: string },
  contact: ContactInfo | null = contactInfo,
) =>
  generateCoverLetterPdfBlob(letter, contact, defaultCoverLetterExportSettings);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-21T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("generateCoverLetterPdfBlob — filename", () => {
  it("derives the filename from the title, with the document-type suffix", async () => {
    const { filename } = await generate({
      title: "Software Engineer - Google",
      content: "<p>Hi</p>",
    });
    expect(filename).toBe("Software Engineer - Google_cover_letter.pdf");
  });

  it("strips path and control characters from the title", async () => {
    const { filename } = await generate({
      title: "Dev/Ops: \x00report\x1f",
      content: "<p>Hi</p>",
    });
    expect(filename).toBe("DevOps report_cover_letter.pdf");
  });

  it("falls back to 'Untitled' when the title sanitizes to nothing", async () => {
    const { filename } = await generate({
      title: '///:*?"<>|',
      content: "<p>Hi</p>",
    });
    expect(filename).toBe("Untitled_cover_letter.pdf");
  });
});

describe("generateCoverLetterPdfBlob — document props", () => {
  it("passes the contact info through for the letterhead", async () => {
    await generate({ title: "Letter", content: "<p>Hi</p>" });
    expect(pdf.mock.calls[0][0].props.contactInfo).toBe(contactInfo);
  });

  it("passes null when there is no default resume contact info", async () => {
    await generate({ title: "Letter", content: "<p>Hi</p>" }, null);
    expect(pdf.mock.calls[0][0].props.contactInfo).toBeNull();
  });

  it("formats today's date as a business-letter date", async () => {
    await generate({ title: "Letter", content: "<p>Hi</p>" });
    expect(pdf.mock.calls[0][0].props.dateLabel).toBe("August 21, 2026");
  });

  it("titles the document from the letter title", async () => {
    await generate({ title: "Letter", content: "<p>Hi</p>" });
    expect(pdf.mock.calls[0][0].props.title).toBe("Letter");
  });

  it("returns the rendered blob", async () => {
    const { blob } = await generate({ title: "Letter", content: "<p>Hi</p>" });
    expect(blob.type).toBe("application/pdf");
    expect(toBlob).toHaveBeenCalledTimes(1);
  });

  it("registers the no-op hyphenation callback", async () => {
    await generate({ title: "Letter", content: "<p>Hi</p>" });
    expect(registerHyphenationCallback).toHaveBeenCalledTimes(1);
  });
});

describe("generateCoverLetterPdfBlob — body conversion", () => {
  it("converts the body with the letter's own htmlStyles", async () => {
    await generate({ title: "Letter", content: "<p>Hi</p>" });
    const [, styleSet] = htmlToPdfNodes.mock.calls[0];
    // paragraphSpacing lands on bodyText.marginBottom, which is what
    // distinguishes the letter's style set from the resume's.
    expect(styleSet!.bodyText).toEqual({ fontSize: 11, marginBottom: 10 });
    expect(styleSet!.bulletChar).toBe("•");
  });

  it("drops blank paragraphs before converting", async () => {
    await generate({
      title: "Letter",
      content: "<p>One</p><p></p><p>Two</p>",
    });
    expect(htmlToPdfNodes.mock.calls[0][0]).toBe("<p>One</p><p>Two</p>");
  });
});

describe("stripEmptyParagraphs", () => {
  it("drops an empty paragraph", () => {
    expect(stripEmptyParagraphs("<p>a</p><p></p><p>b</p>")).toBe(
      "<p>a</p><p>b</p>",
    );
  });

  it("drops a whitespace-only and an nbsp-only paragraph", () => {
    expect(stripEmptyParagraphs("<p>a</p><p>   </p><p>&nbsp;</p>")).toBe(
      "<p>a</p>",
    );
  });

  it("drops a paragraph holding only a line break", () => {
    expect(stripEmptyParagraphs("<p><br></p><p>a</p>")).toBe("<p>a</p>");
  });

  it("keeps a paragraph with real text", () => {
    expect(stripEmptyParagraphs("<p>Dear hiring manager,</p>")).toBe(
      "<p>Dear hiring manager,</p>",
    );
  });

  it("leaves lists and headings alone", () => {
    const html = "<h2>Why me</h2><ul><li>One</li></ul>";
    expect(stripEmptyParagraphs(html)).toBe(html);
  });
});
