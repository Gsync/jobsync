import fs from "fs";
import os from "os";
import path from "path";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  isResumeFilePath,
  removeResumeFile,
  resumesDir,
  saveResumeUpload,
} from "@/lib/resumeFiles";

const originalUploads = APP_CONSTANTS.UPLOADS_DIR;
const setUploadsDir = (dir: string) => {
  (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = dir;
};

describe("isResumeFilePath", () => {
  afterEach(() => setUploadsDir(originalUploads));

  it("resolves the resumes directory under UPLOADS_DIR", () => {
    expect(resumesDir()).toBe(
      path.resolve(originalUploads, "files", "resumes"),
    );
  });

  it("accepts relative and absolute paths inside the directory", () => {
    expect(
      isResumeFilePath(path.join(originalUploads, "files", "resumes", "cv.pdf")),
    ).toBe(true);
    expect(isResumeFilePath(path.join(resumesDir(), "cv.pdf"))).toBe(true);
  });

  it.each([
    ["the directory itself", () => resumesDir()],
    ["a backup snapshot", () =>
      path.join(originalUploads, "backups", "u1", "pre-import.zip")],
    ["the database", () => path.join(originalUploads, "dev.db")],
    ["a sibling directory", () => path.join(`${resumesDir()}-old`, "cv.pdf")],
    ["an absolute system path", () => "/etc/passwd"],
    ["a ../ traversal", () => `${resumesDir()}/../../dev.db`],
  ])("rejects %s", (_label, make) => {
    expect(isResumeFilePath(make())).toBe(false);
  });

  it("follows a runtime UPLOADS_DIR override", () => {
    const tmp = path.join(os.tmpdir(), "jobsync-override");
    setUploadsDir(tmp);

    expect(isResumeFilePath(path.join(tmp, "files", "resumes", "cv.pdf"))).toBe(
      true,
    );
    expect(
      isResumeFilePath(path.join(originalUploads, "files", "resumes", "cv.pdf")),
    ).toBe(false);
  });
});

describe("saveResumeUpload / removeResumeFile", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobsync-resumes-"));
    setUploadsDir(tmp);
  });

  afterEach(() => {
    setUploadsDir(originalUploads);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates the directory and writes the bytes under a timestamped name", async () => {
    const upload = await saveResumeUpload("cv.pdf", Buffer.from("%PDF-1.4 x"));

    expect(upload.fileName).toBe("cv.pdf");
    expect(isResumeFilePath(upload.filePath)).toBe(true);
    expect(path.basename(upload.filePath)).toMatch(
      /^cv_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/,
    );
    expect(fs.readFileSync(upload.filePath).toString()).toBe("%PDF-1.4 x");
  });

  it("never lets the client file name choose the directory", async () => {
    const upload = await saveResumeUpload("../../dev.pdf", Buffer.from("%PDF"));

    expect(path.dirname(path.resolve(upload.filePath))).toBe(resumesDir());
  });

  it("unlinks a file inside the directory", async () => {
    const { filePath } = await saveResumeUpload("cv.pdf", Buffer.from("%PDF"));

    await removeResumeFile(filePath);

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("leaves a path outside the directory on disk", async () => {
    const outside = path.join(tmp, "dev.db");
    fs.writeFileSync(outside, "db");

    await removeResumeFile(outside);

    expect(fs.existsSync(outside)).toBe(true);
  });

  it("does not throw when the file is already gone", async () => {
    await expect(
      removeResumeFile(path.join(resumesDir(), "missing.pdf")),
    ).resolves.toBeUndefined();
  });
});
