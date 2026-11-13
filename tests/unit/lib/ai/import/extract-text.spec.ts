import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sniffFileType,
  extractText,
  PDF_MAGIC,
  ZIP_MAGIC,
} from "@/lib/ai/import/extract-text";
import { APP_CONSTANTS } from "@/lib/constants";

// Hoist mock fns so they're available in the vi.mock factory
const { mockGetDocumentProxy, mockPdfExtractText, mockMammothExtractRawText } =
  vi.hoisted(() => ({
    mockGetDocumentProxy: vi.fn(),
    mockPdfExtractText: vi.fn(),
    mockMammothExtractRawText: vi.fn(),
  }));

vi.mock("unpdf", () => ({
  getDocumentProxy: mockGetDocumentProxy,
  extractText: mockPdfExtractText,
}));

vi.mock("mammoth", () => ({
  extractRawText: mockMammothExtractRawText,
}));

// Minimal valid ZIP buffer (no CD entries) — passes preflightZip bomb checks
function makeDocxBuf(): Buffer {
  // [4 bytes ZIP magic] [22 bytes EOCD]
  const buf = Buffer.alloc(26);
  ZIP_MAGIC.copy(buf, 0);
  const eocd = 4; // buf.length - 22 = 4
  buf.writeUInt32LE(0x06054b50, eocd); // EOCD signature
  buf.writeUInt16LE(0, eocd + 4);  // disk number
  buf.writeUInt16LE(0, eocd + 6);  // disk with CD start
  buf.writeUInt16LE(0, eocd + 8);  // entries on disk
  buf.writeUInt16LE(0, eocd + 10); // total entries
  buf.writeUInt32LE(0, eocd + 12); // CD size
  buf.writeUInt32LE(0, eocd + 16); // CD offset (0 → no CD sig at 0, loop exits)
  buf.writeUInt16LE(0, eocd + 20); // comment length
  return buf;
}

// ZIP buffer with N real central-directory entries (each claiming uncompressedSize bytes)
function makeDocxBufWithEntries(n: number, uncompressedSizeEach = 0): Buffer {
  const CD_ENTRY = 46; // min CD entry size (no filename/extra/comment)
  const cdSize = n * CD_ENTRY;
  const buf = Buffer.alloc(4 + cdSize + 22); // magic + CD + EOCD
  ZIP_MAGIC.copy(buf, 0);

  const cdOffset = 4;
  for (let i = 0; i < n; i++) {
    const off = cdOffset + i * CD_ENTRY;
    buf.writeUInt32LE(0x02014b50, off);            // CD signature
    buf.writeUInt32LE(uncompressedSizeEach, off + 24); // uncompressed size
  }

  const eocdOffset = 4 + cdSize;
  buf.writeUInt32LE(0x06054b50, eocdOffset);
  buf.writeUInt16LE(n, eocdOffset + 8);  // entries on disk
  buf.writeUInt16LE(n, eocdOffset + 10); // total entries
  buf.writeUInt32LE(cdSize, eocdOffset + 12);
  buf.writeUInt32LE(cdOffset, eocdOffset + 16); // CD starts at offset 4
  return buf;
}

function makePdfBuf(): Buffer {
  const buf = Buffer.alloc(8);
  PDF_MAGIC.copy(buf);
  return buf;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- sniffFileType ---

describe("sniffFileType", () => {
  it("identifies PDF by magic bytes", () => {
    const buf = Buffer.alloc(8);
    PDF_MAGIC.copy(buf);
    expect(sniffFileType(buf)).toBe("pdf");
  });

  it("identifies DOCX by ZIP magic bytes", () => {
    const buf = Buffer.alloc(8);
    ZIP_MAGIC.copy(buf);
    expect(sniffFileType(buf)).toBe("docx");
  });

  it("returns null for unknown format", () => {
    expect(sniffFileType(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it("returns null for empty buffer", () => {
    expect(sniffFileType(Buffer.alloc(0))).toBeNull();
  });

  it("returns null for buffer shorter than 4 bytes", () => {
    expect(sniffFileType(Buffer.from([0x25, 0x50]))).toBeNull();
  });

  it("does not confuse a near-match with PDF (4th byte differs)", () => {
    expect(sniffFileType(Buffer.from([0x25, 0x50, 0x44, 0x00]))).toBeNull();
  });
});

// --- extractText — unsupported format ---

describe("extractText — unsupported format", () => {
  it("returns UNSUPPORTED_FORMAT for an unknown file type", async () => {
    const result = await extractText(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNSUPPORTED_FORMAT");
      expect(result.error.message).toMatch(/pdf|word/i);
    }
  });
});

// --- extractText — PDF ---

describe("extractText — PDF", () => {
  it("returns extracted text for a valid single-page PDF", async () => {
    mockGetDocumentProxy.mockResolvedValue({ numPages: 1 });
    mockPdfExtractText.mockResolvedValue({ text: ["Hello world resume content"] });

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toContain("Hello world resume content");
      expect(result.data.truncated).toBe(false);
    }
  });

  it("sets truncated=true when PDF exceeds max pages", async () => {
    const over = APP_CONSTANTS.RESUME_IMPORT_MAX_PDF_PAGES + 2;
    mockGetDocumentProxy.mockResolvedValue({ numPages: over });
    mockPdfExtractText.mockResolvedValue({
      text: Array(over).fill("Page content."),
    });

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.truncated).toBe(true);
    }
  });

  it("sets truncated=true and slices text when extracted chars exceed limit", async () => {
    mockGetDocumentProxy.mockResolvedValue({ numPages: 1 });
    mockPdfExtractText.mockResolvedValue({
      text: ["a".repeat(APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS + 500)],
    });

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.truncated).toBe(true);
      expect(result.data.text.length).toBe(APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS);
    }
  });

  it("returns NO_TEXT when PDF yields only whitespace", async () => {
    mockGetDocumentProxy.mockResolvedValue({ numPages: 1 });
    mockPdfExtractText.mockResolvedValue({ text: ["   "] });

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NO_TEXT");
    }
  });

  it("returns ENCRYPTED when error message contains 'password'", async () => {
    mockGetDocumentProxy.mockRejectedValue(new Error("password required to decrypt"));

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("ENCRYPTED");
    }
  });

  it("returns ENCRYPTED when error message contains 'encrypt'", async () => {
    mockGetDocumentProxy.mockRejectedValue(new Error("encrypted document"));

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("ENCRYPTED");
    }
  });

  it("returns EXTRACTION_FAILED for generic PDF errors", async () => {
    mockGetDocumentProxy.mockRejectedValue(new Error("corrupted file"));

    const result = await extractText(makePdfBuf());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("EXTRACTION_FAILED");
      expect(result.error.message).toContain("corrupted file");
    }
  });
});

// --- extractText — DOCX ---

describe("extractText — DOCX", () => {
  it("returns extracted text for a valid DOCX", async () => {
    mockMammothExtractRawText.mockResolvedValue({
      value: "John Doe\nSenior Engineer\n8 years experience building systems",
      messages: [],
    });

    const result = await extractText(makeDocxBuf());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toContain("John Doe");
      expect(result.data.truncated).toBe(false);
    }
  });

  it("returns NO_TEXT when DOCX yields only whitespace", async () => {
    mockMammothExtractRawText.mockResolvedValue({ value: "   ", messages: [] });

    const result = await extractText(makeDocxBuf());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NO_TEXT");
    }
  });

  it("sets truncated=true and slices text when DOCX exceeds char limit", async () => {
    mockMammothExtractRawText.mockResolvedValue({
      value: "b".repeat(APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS + 200),
      messages: [],
    });

    const result = await extractText(makeDocxBuf());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.truncated).toBe(true);
      expect(result.data.text.length).toBe(APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS);
    }
  });

  it("returns DECOMPRESSION_BOMB when ZIP has too many CD entries", async () => {
    const tooMany = APP_CONSTANTS.RESUME_IMPORT_MAX_DOCX_ENTRIES + 1;
    const result = await extractText(makeDocxBufWithEntries(tooMany));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DECOMPRESSION_BOMB");
    }
  });

  it("returns DECOMPRESSION_BOMB when uncompressed size exceeds limit", async () => {
    // 10 entries × 15 MB = 150 MB > 100 MB limit
    const result = await extractText(makeDocxBufWithEntries(10, 15 * 1024 * 1024));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DECOMPRESSION_BOMB");
    }
  });

  it("returns EXTRACTION_FAILED for a buffer with ZIP magic but no valid EOCD", async () => {
    const buf = Buffer.alloc(10);
    ZIP_MAGIC.copy(buf);
    // No EOCD → preflightZip throws

    const result = await extractText(buf);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("EXTRACTION_FAILED");
    }
  });
});
