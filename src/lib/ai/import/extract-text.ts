// Text extraction from PDF and DOCX resume uploads

import { APP_CONSTANTS } from "@/lib/constants";

// Magic bytes for file-type sniffing (Buffer — server-only, not in constants.ts)
export const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
export const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK local file header

export type ExtractedText = {
  text: string;
  truncated: boolean;
};

export type ExtractionError =
  | { code: "UNSUPPORTED_FORMAT"; message: string }
  | { code: "NO_TEXT"; message: string }
  | { code: "DECOMPRESSION_BOMB"; message: string }
  | { code: "ENCRYPTED"; message: string }
  | { code: "EXTRACTION_FAILED"; message: string };

export type ExtractionResult =
  | { success: true; data: ExtractedText }
  | { success: false; error: ExtractionError };

export function sniffFileType(buf: Buffer): "pdf" | "docx" | null {
  if (buf.subarray(0, 4).equals(PDF_MAGIC)) return "pdf";
  if (buf.subarray(0, 4).equals(ZIP_MAGIC)) return "docx";
  return null;
}

// Parse ZIP Central Directory to sum uncompressed sizes and count entries
function preflightZip(buf: Buffer): { entries: number; uncompressedBytes: number } {
  const EOCD_SIG = 0x06054b50;
  const CD_SIG = 0x02014b50;

  let eocdOffset = -1;
  const searchStart = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Not a valid ZIP archive");

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  if (cdOffset >= buf.length) throw new Error("Not a valid ZIP archive");

  let offset = cdOffset;
  let uncompressedBytes = 0;
  let entries = 0;

  while (entries < totalEntries && offset + 46 <= buf.length) {
    if (buf.readUInt32LE(offset) !== CD_SIG) break;
    uncompressedBytes += buf.readUInt32LE(offset + 24);
    const filenameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    entries++;
    offset += 46 + filenameLen + extraLen + commentLen;
  }

  return { entries, uncompressedBytes };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Extraction timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function extractPdf(buf: Buffer): Promise<ExtractedText> {
  const { getDocumentProxy, extractText: pdfExtractText } = await import("unpdf");
  const uint8 = new Uint8Array(buf);
  const pdf = await getDocumentProxy(uint8);
  const numPages = pdf.numPages;
  const pagesToRead = Math.min(numPages, APP_CONSTANTS.RESUME_IMPORT_MAX_PDF_PAGES);
  const truncated = numPages > APP_CONSTANTS.RESUME_IMPORT_MAX_PDF_PAGES;

  const { text: pages } = await pdfExtractText(pdf, { mergePages: false });
  const pageArray = Array.isArray(pages) ? pages : [pages as string];
  const text = pageArray.slice(0, pagesToRead).join("\n");

  if (!text.trim()) {
    throw Object.assign(new Error("NO_TEXT"), { code: "NO_TEXT" });
  }

  const final =
    text.length > APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS
      ? text.slice(0, APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS)
      : text;

  return {
    text: final,
    truncated: truncated || text.length > APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS,
  };
}

async function extractDocx(buf: Buffer): Promise<ExtractedText> {
  // Decompression bomb pre-flight before handing to mammoth
  let preflightResult;
  try {
    preflightResult = preflightZip(buf);
  } catch {
    throw Object.assign(new Error("Invalid DOCX"), { code: "EXTRACTION_FAILED" });
  }

  if (preflightResult.entries > APP_CONSTANTS.RESUME_IMPORT_MAX_DOCX_ENTRIES) {
    throw Object.assign(
      new Error(`DOCX contains too many entries (${preflightResult.entries})`),
      { code: "DECOMPRESSION_BOMB" },
    );
  }
  if (preflightResult.uncompressedBytes > APP_CONSTANTS.RESUME_IMPORT_MAX_DOCX_UNCOMPRESSED_BYTES) {
    throw Object.assign(
      new Error("DOCX uncompressed content exceeds size limit"),
      { code: "DECOMPRESSION_BOMB" },
    );
  }

  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });

  if (!result.value.trim()) {
    throw Object.assign(new Error("NO_TEXT"), { code: "NO_TEXT" });
  }

  const text =
    result.value.length > APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS
      ? result.value.slice(0, APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS)
      : result.value;

  return {
    text,
    truncated: result.value.length > APP_CONSTANTS.RESUME_IMPORT_MAX_EXTRACTED_CHARS,
  };
}

export async function extractText(buf: Buffer): Promise<ExtractionResult> {
  const type = sniffFileType(buf);

  if (!type) {
    return {
      success: false,
      error: {
        code: "UNSUPPORTED_FORMAT",
        message: "Only PDF and Word (.docx) files are supported.",
      },
    };
  }

  try {
    const extracted = await withTimeout(
      type === "pdf" ? extractPdf(buf) : extractDocx(buf),
      APP_CONSTANTS.RESUME_IMPORT_EXTRACT_TIMEOUT_MS,
    );
    return { success: true, data: extracted };
  } catch (err: any) {
    const code: string = err?.code ?? "";
    if (code === "NO_TEXT") {
      return {
        success: false,
        error: {
          code: "NO_TEXT",
          message:
            "Couldn't read any text from this document. It may be scanned or image-only (OCR isn't supported yet).",
        },
      };
    }
    if (code === "DECOMPRESSION_BOMB") {
      return {
        success: false,
        error: { code: "DECOMPRESSION_BOMB", message: err.message },
      };
    }
    if (err?.message?.includes("password") || err?.message?.includes("encrypt")) {
      return {
        success: false,
        error: {
          code: "ENCRYPTED",
          message: "This document appears to be password-protected.",
        },
      };
    }
    return {
      success: false,
      error: {
        code: "EXTRACTION_FAILED",
        message: `Failed to extract text: ${err?.message ?? "Unknown error"}`,
      },
    };
  }
}
