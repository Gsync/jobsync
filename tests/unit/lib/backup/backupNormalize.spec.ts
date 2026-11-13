import path from "path";
import {
  safeEntryName,
  importedFilePath,
  checkImportedFile,
  normalizeAutomationRun,
  normalizeAutomation,
} from "@/lib/backup/normalize";
import { APP_CONSTANTS } from "@/lib/constants";

describe("safeEntryName", () => {
  it("reduces a traversal path to its basename", () => {
    expect(safeEntryName("../../etc/passwd")).toBe("passwd");
  });

  it("reduces an absolute path to its basename", () => {
    expect(safeEntryName("/data/dev.db")).toBe("dev.db");
  });

  it("reduces a windows-style path to its basename", () => {
    expect(safeEntryName("C:\\Users\\me\\resume.pdf")).toBe("resume.pdf");
  });

  it("falls back to a placeholder for an empty or dot-only name", () => {
    expect(safeEntryName("")).toBe("file");
    expect(safeEntryName("..")).toBe("file");
    expect(safeEntryName("/")).toBe("file");
  });

  it("leaves an ordinary filename alone, dashes included", () => {
    expect(safeEntryName("files/abc/my-resume-v2.pdf")).toBe("my-resume-v2.pdf");
  });
});

describe("importedFilePath", () => {
  const uploads = APP_CONSTANTS.UPLOADS_DIR;

  it("writes inside the resumes subdirectory, never UPLOADS_DIR itself", () => {
    const p = importedFilePath("new-id", "resume.pdf", "pdf");
    expect(p).toBe(path.join(uploads, "files", "resumes", "new-id-resume.pdf"));
  });

  it("never persists a path carried in the backup", () => {
    const p = importedFilePath("new-id", "/data/dev.db", "pdf");
    expect(p).toBe(path.join(uploads, "files", "resumes", "new-id-dev.pdf"));
    expect(p.startsWith(path.join(uploads, "files", "resumes"))).toBe(true);
  });

  // The extension follows the sniffed bytes, not the name in the backup, so a
  // payload cannot choose what the file on disk is called.
  it("overrides the carried extension with the sniffed one", () => {
    expect(importedFilePath("new-id", "resume.pdf.exe", "docx")).toBe(
      path.join(uploads, "files", "resumes", "new-id-resume.pdf.docx"),
    );
    expect(importedFilePath("new-id", "payload.sh", "pdf")).toBe(
      path.join(uploads, "files", "resumes", "new-id-payload.pdf"),
    );
  });

  it("cannot collide for two files sharing an original name", () => {
    expect(importedFilePath("id-a", "resume.pdf", "pdf")).not.toBe(
      importedFilePath("id-b", "resume.pdf", "pdf"),
    );
  });
});

describe("checkImportedFile", () => {
  const pdf = Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(64)]);
  const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);

  it("accepts bytes that really are a PDF", () => {
    expect(checkImportedFile(pdf)).toEqual({ kind: "pdf", mimeType: "application/pdf" });
  });

  it("accepts bytes that really are a DOCX", () => {
    expect(checkImportedFile(docx)?.kind).toBe("docx");
  });

  // The whole point: an executable renamed resume.pdf inside the zip.
  it("rejects bytes that are neither, whatever they are called", () => {
    expect(checkImportedFile(Buffer.from("MZ\x90\x00 not a resume"))).toBeNull();
    expect(checkImportedFile(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    expect(checkImportedFile(Buffer.alloc(0))).toBeNull();
  });

  it("rejects a file over the resume size cap", () => {
    const huge = Buffer.concat([
      Buffer.from("%PDF"),
      Buffer.alloc(APP_CONSTANTS.MAX_RESUME_FILE_SIZE_BYTES),
    ]);
    expect(checkImportedFile(huge)).toBeNull();
  });
});

describe("normalizeAutomationRun", () => {
  const base = {
    status: "running",
    errorMessage: null as string | null,
    completedAt: null as Date | null,
  };

  it("rewrites a running run to the shape reapStaleRuns writes", () => {
    const row = normalizeAutomationRun({ ...base });
    expect(row.status).toBe("failed");
    expect(row.errorMessage).toBe("interrupted");
    expect(row.completedAt).toBeInstanceOf(Date);
  });

  it("rewrites a cancelling run too, since reapStaleRuns never would", () => {
    expect(normalizeAutomationRun({ ...base, status: "cancelling" }).status).toBe(
      "failed",
    );
  });

  it("leaves terminal statuses untouched", () => {
    const completed = normalizeAutomationRun({
      status: "completed",
      errorMessage: null,
      completedAt: new Date("2026-01-01"),
    });
    expect(completed.status).toBe("completed");
    expect(completed.errorMessage).toBeNull();
    expect(completed.completedAt).toEqual(new Date("2026-01-01"));
  });
});

describe("normalizeAutomation", () => {
  it("moves a past nextRunAt forward without deactivating the automation", () => {
    const row = normalizeAutomation({
      status: "active",
      scheduleHour: 9,
      nextRunAt: new Date("2020-01-01T09:00:00"),
    });
    expect(row.status).toBe("active");
    expect(row.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
    expect(row.nextRunAt!.getHours()).toBe(9);
  });

  it("recomputes even when nextRunAt is null", () => {
    const row = normalizeAutomation({
      status: "active",
      scheduleHour: 14,
      nextRunAt: null as Date | null,
    });
    expect(row.nextRunAt!.getHours()).toBe(14);
  });

  it("leaves a paused automation without a next run", () => {
    const row = normalizeAutomation({
      status: "paused",
      scheduleHour: 9,
      nextRunAt: new Date("2020-01-01T09:00:00"),
    });
    expect(row.nextRunAt).toBeNull();
  });
});
