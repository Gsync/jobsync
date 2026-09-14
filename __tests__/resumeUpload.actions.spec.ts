import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { createFileEntry } from "@/actions/profile/shared";
import { editResume } from "@/actions/profile.actions";
import {
  createResume,
  replaceResumeFile,
} from "@/actions/profile/resumeUpload";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient: Record<string, any> = {
    resume: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    profile: { findFirst: vi.fn(), create: vi.fn() },
    user: { update: vi.fn() },
    file: { create: vi.fn(), delete: vi.fn() },
  };
  // Interactive transaction: hand the callback the same mock client
  mPrismaClient.$transaction = vi.fn((fn: (tx: unknown) => unknown) =>
    fn(mPrismaClient),
  );
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const db = prisma as any;
const originalUploads = APP_CONSTANTS.UPLOADS_DIR;
let tmp: string;
let resumes: string;

const writeResumeFile = (name: string, content: string) => {
  const filePath = path.join(resumes, name);
  fs.writeFileSync(filePath, content);
  return filePath;
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobsync-upload-"));
  resumes = path.join(tmp, "files", "resumes");
  fs.mkdirSync(resumes, { recursive: true });
  (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = tmp;
  (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
});

afterEach(() => {
  (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = originalUploads;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("createFileEntry", () => {
  it("refuses a path outside the resumes directory before writing", async () => {
    await expect(createFileEntry("x.pdf", "/etc/passwd")).rejects.toThrow(
      "File path is outside the resumes directory",
    );
    await expect(createFileEntry("x.pdf", undefined)).rejects.toThrow(
      "File path is outside the resumes directory",
    );
    expect(db.file.create).not.toHaveBeenCalled();
  });

  it("writes through the client it is given", async () => {
    const tx = { file: { create: vi.fn().mockResolvedValue({ id: "f-tx" }) } };

    const id = await createFileEntry("cv.pdf", path.join(resumes, "cv.pdf"), tx as any);

    expect(id).toBe("f-tx");
    expect(tx.file.create).toHaveBeenCalledWith({
      data: {
        fileName: "cv.pdf",
        filePath: path.join(resumes, "cv.pdf"),
        fileType: "resume",
      },
    });
    expect(db.file.create).not.toHaveBeenCalled();
  });
});

describe("createResume", () => {
  beforeEach(() => {
    db.resume.findMany.mockResolvedValue([]);
    db.resume.count.mockResolvedValue(1);
    db.profile.findFirst.mockResolvedValue({ id: "profile-1" });
  });

  it("links a file built from the upload", async () => {
    const filePath = writeResumeFile("cv.pdf", "%PDF");
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.create.mockResolvedValue({ id: "r-new" });

    const result = await createResume("CV", { fileName: "cv.pdf", filePath });

    expect(result).toEqual({ success: true, data: { id: "r-new" } });
    expect(db.resume.create).toHaveBeenCalledWith({
      data: { profileId: "profile-1", title: "CV", FileId: "f-new" },
    });
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("creates without a file when there is no upload", async () => {
    db.resume.create.mockResolvedValue({ id: "r-new" });

    const result = await createResume("CV");

    expect(result.success).toBe(true);
    expect(db.file.create).not.toHaveBeenCalled();
    expect(db.resume.create).toHaveBeenCalledWith({
      data: { profileId: "profile-1", title: "CV", FileId: null },
    });
  });

  it("removes the uploaded bytes when the create fails", async () => {
    const filePath = writeResumeFile("cv.pdf", "%PDF");
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.create.mockRejectedValue(new Error("boom"));

    const result = await createResume("CV", { fileName: "cv.pdf", filePath });

    expect(result).toEqual({ success: false, message: "boom" });
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("keeps the bytes when the resume was created but the auto-default fails", async () => {
    const filePath = writeResumeFile("cv.pdf", "%PDF");
    db.resume.count.mockResolvedValue(0);
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.create.mockResolvedValue({ id: "r-new" });
    db.user.update.mockRejectedValue(new Error("db busy"));

    const result = await createResume("CV", { fileName: "cv.pdf", filePath });

    expect(result).toEqual({ success: false, message: "db busy" });
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe("replaceResumeFile", () => {
  it("links the new file, then deletes the old row and bytes", async () => {
    const oldPath = writeResumeFile("old.pdf", "%PDF old");
    const newPath = writeResumeFile("new.pdf", "%PDF new");
    db.resume.findUnique.mockResolvedValue({
      File: { id: "f-old", filePath: oldPath },
    });
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.update.mockResolvedValue({ id: "r1", FileId: "f-new" });
    db.file.delete.mockResolvedValue({});

    const result = await replaceResumeFile("r1", "CV", {
      fileName: "new.pdf",
      filePath: newPath,
    });

    expect(result).toEqual({ success: true, data: { id: "r1", FileId: "f-new" } });
    expect(db.resume.findUnique).toHaveBeenCalledWith({
      where: { id: "r1", profile: { userId: "user-1" } },
      select: { File: { select: { id: true, filePath: true } } },
    });
    expect(db.resume.update).toHaveBeenCalledWith({
      where: { id: "r1", profile: { userId: "user-1" } },
      data: { title: "CV", FileId: "f-new" },
    });
    expect(db.file.delete).toHaveBeenCalledWith({ where: { id: "f-old" } });
    expect(db.resume.update.mock.invocationCallOrder[0]).toBeLessThan(
      db.file.delete.mock.invocationCallOrder[0],
    );
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(newPath)).toBe(true);
  });

  it("keeps the old file and removes the new bytes when the update fails", async () => {
    const oldPath = writeResumeFile("old.pdf", "%PDF old");
    const newPath = writeResumeFile("new.pdf", "%PDF new");
    db.resume.findUnique.mockResolvedValue({
      File: { id: "f-old", filePath: oldPath },
    });
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.update.mockRejectedValue(new Error("update failed"));

    const result = await replaceResumeFile("r1", "CV", {
      fileName: "new.pdf",
      filePath: newPath,
    });

    expect(result).toEqual({ success: false, message: "update failed" });
    expect(db.file.delete).not.toHaveBeenCalled();
    expect(fs.existsSync(oldPath)).toBe(true);
    expect(fs.existsSync(newPath)).toBe(false);
  });

  it("rejects a resume the caller does not own before any write", async () => {
    const newPath = writeResumeFile("new.pdf", "%PDF new");
    db.resume.findUnique.mockResolvedValue(null);

    const result = await replaceResumeFile("someone-elses", "CV", {
      fileName: "new.pdf",
      filePath: newPath,
    });

    expect(result).toEqual({
      success: false,
      message: "Resume not found or access denied",
    });
    expect(db.file.create).not.toHaveBeenCalled();
    expect(db.resume.update).not.toHaveBeenCalled();
    expect(fs.existsSync(newPath)).toBe(false);
  });

  it("attaches a file to a resume that had none", async () => {
    const newPath = writeResumeFile("new.pdf", "%PDF new");
    db.resume.findUnique.mockResolvedValue({ File: null });
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.update.mockResolvedValue({ id: "r1", FileId: "f-new" });

    const result = await replaceResumeFile("r1", "CV", {
      fileName: "new.pdf",
      filePath: newPath,
    });

    expect(result.success).toBe(true);
    expect(db.file.delete).not.toHaveBeenCalled();
  });

  it("keeps the bytes when the old and new paths collide", async () => {
    const samePath = writeResumeFile("cv.pdf", "%PDF new");
    db.resume.findUnique.mockResolvedValue({
      File: { id: "f-old", filePath: samePath },
    });
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.update.mockResolvedValue({ id: "r1", FileId: "f-new" });
    db.file.delete.mockResolvedValue({});

    const result = await replaceResumeFile("r1", "CV", {
      fileName: "cv.pdf",
      filePath: samePath,
    });

    expect(result.success).toBe(true);
    expect(db.file.delete).toHaveBeenCalledWith({ where: { id: "f-old" } });
    expect(fs.existsSync(samePath)).toBe(true);
  });

  it("still succeeds when the old row cannot be deleted", async () => {
    const oldPath = writeResumeFile("old.pdf", "%PDF old");
    const newPath = writeResumeFile("new.pdf", "%PDF new");
    db.resume.findUnique.mockResolvedValue({
      File: { id: "f-old", filePath: oldPath },
    });
    db.file.create.mockResolvedValue({ id: "f-new" });
    db.resume.update.mockResolvedValue({ id: "r1", FileId: "f-new" });
    db.file.delete.mockRejectedValue(new Error("P2025"));

    const result = await replaceResumeFile("r1", "CV", {
      fileName: "new.pdf",
      filePath: newPath,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.existsSync(oldPath)).toBe(true);
  });
});

describe("editResume", () => {
  it("updates the title only and never touches FileId", async () => {
    db.resume.update.mockResolvedValue({ id: "r1", title: "New" });

    const result = await (editResume as any)("r1", "New", "client-file-id", "x.pdf", "/etc/passwd");

    expect(result.success).toBe(true);
    expect(db.resume.update).toHaveBeenCalledWith({
      where: { id: "r1", profile: { userId: "user-1" } },
      data: { title: "New" },
    });
    expect(db.file.create).not.toHaveBeenCalled();
  });

  it("checks the session before any write", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await editResume("r1", "New");

    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(db.resume.update).not.toHaveBeenCalled();
    expect(db.file.create).not.toHaveBeenCalled();
  });
});
