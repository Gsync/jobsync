import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { deleteFile } from "@/actions/profile.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    file: { findFirst: vi.fn(), delete: vi.fn() },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

describe("deleteFile", () => {
  const originalUploads = APP_CONSTANTS.UPLOADS_DIR;
  let tmp: string;
  let resumes: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobsync-delete-"));
    resumes = path.join(tmp, "files", "resumes");
    fs.mkdirSync(resumes, { recursive: true });
    (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = tmp;
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
    (prisma.file.delete as any).mockResolvedValue({});
  });

  afterEach(() => {
    (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = originalUploads;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("unlinks the bytes and deletes the row for a file inside the directory", async () => {
    const filePath = path.join(resumes, "cv.pdf");
    fs.writeFileSync(filePath, "%PDF");
    (prisma.file.findFirst as any).mockResolvedValue({ id: "f1", filePath });

    await deleteFile("f1");

    expect(prisma.file.findFirst).toHaveBeenCalledWith({
      where: { id: "f1", Resume: { profile: { userId: "user-1" } } },
    });
    expect(fs.existsSync(filePath)).toBe(false);
    expect(prisma.file.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
  });

  it("skips the unlink for a stored path outside the directory but still deletes the row", async () => {
    const outside = path.join(tmp, "dev.db");
    fs.writeFileSync(outside, "db");
    (prisma.file.findFirst as any).mockResolvedValue({
      id: "f1",
      filePath: outside,
    });

    await deleteFile("f1");

    expect(fs.existsSync(outside)).toBe(true);
    expect(prisma.file.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
  });

  it("refuses a file the caller does not own", async () => {
    (prisma.file.findFirst as any).mockResolvedValue(null);

    await expect(deleteFile("someone-elses")).rejects.toThrow(
      "File not found or access denied",
    );
    expect(prisma.file.delete).not.toHaveBeenCalled();
  });
});
