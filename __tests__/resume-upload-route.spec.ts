// @vitest-environment node
// Tests for POST /api/profile/resume: the route builds the upload path itself
// and never forwards a client-supplied fileId.

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ default: {} }));
vi.mock("@/actions/profile.actions", () => ({ editResume: vi.fn() }));
vi.mock("@/actions/profile/resumeUpload", () => ({
  createResume: vi.fn(),
  replaceResumeFile: vi.fn(),
}));
vi.mock("@/lib/resumeFiles", () => ({
  saveResumeUpload: vi.fn(),
  isResumeFilePath: vi.fn(),
}));
vi.mock("next/server", () => ({
  NextResponse: class {
    static json(data: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => data };
    }
  },
}));

import { POST } from "@/app/api/profile/resume/route";
import { auth } from "@/auth";
import { editResume } from "@/actions/profile.actions";
import {
  createResume,
  replaceResumeFile,
} from "@/actions/profile/resumeUpload";
import { saveResumeUpload } from "@/lib/resumeFiles";

const UPLOAD = {
  fileName: "cv.pdf",
  filePath: "data/files/resumes/cv_2026-09-13T12-00-00.pdf",
};

const pdf = (bytes = "%PDF-1.4 test") =>
  new File([Buffer.from(bytes)], "cv.pdf", { type: "application/pdf" });

// The client appends `undefined` when there is no file, which sends this string
const NO_FILE = "undefined";

const post = async (fields: Record<string, string | File>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  const res: any = await POST({ formData: async () => fd } as any);
  return { status: res.status, body: await res.json() };
};

describe("POST /api/profile/resume", () => {
  beforeEach(() => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (saveResumeUpload as any).mockResolvedValue(UPLOAD);
    (createResume as any).mockResolvedValue({ success: true, data: { id: "r-new" } });
    (replaceResumeFile as any).mockResolvedValue({ success: true, data: { id: "r1" } });
    (editResume as any).mockResolvedValue({ success: true, data: { id: "r1" } });
  });

  it("replaces an edited resume's file and never forwards the client fileId", async () => {
    const res = await post({
      file: pdf(),
      title: "CV",
      id: "r1",
      fileId: "someone-elses-file",
    });

    expect(res.status).toBe(200);
    expect(saveResumeUpload).toHaveBeenCalledWith("cv.pdf", expect.any(Buffer));
    expect(replaceResumeFile).toHaveBeenCalledWith("r1", "CV", UPLOAD);
    expect(JSON.stringify((replaceResumeFile as any).mock.calls)).not.toContain(
      "someone-elses-file",
    );
    expect(editResume).not.toHaveBeenCalled();
  });

  it("renames without touching the file when no file is sent", async () => {
    const res = await post({ file: NO_FILE, title: "CV", id: "r1", fileId: "f1" });

    expect(res.status).toBe(200);
    expect(editResume).toHaveBeenCalledWith("r1", "CV");
    expect(saveResumeUpload).not.toHaveBeenCalled();
    expect(replaceResumeFile).not.toHaveBeenCalled();
  });

  it("creates a resume with an uploaded file", async () => {
    const res = await post({ file: pdf(), title: "CV" });

    expect(res.status).toBe(201);
    expect(createResume).toHaveBeenCalledWith("CV", UPLOAD);
    expect(res.body).toEqual({ success: true, data: { id: "r-new" } });
  });

  it("creates a resume without a file", async () => {
    const res = await post({ file: NO_FILE, title: "CV" });

    expect(res.status).toBe(201);
    expect(createResume).toHaveBeenCalledWith("CV", undefined);
    expect(saveResumeUpload).not.toHaveBeenCalled();
  });

  it("refuses bytes that do not match the declared type before saving", async () => {
    const res = await post({ file: pdf("not a pdf"), title: "CV" });

    expect(res.status).toBe(400);
    expect(saveResumeUpload).not.toHaveBeenCalled();
    expect(createResume).not.toHaveBeenCalled();
  });

  it("passes a failed replace through as 200 with success false", async () => {
    (replaceResumeFile as any).mockResolvedValue({ success: false, message: "boom" });

    const res = await post({ file: pdf(), title: "CV", id: "r1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: false, message: "boom" });
  });
});
