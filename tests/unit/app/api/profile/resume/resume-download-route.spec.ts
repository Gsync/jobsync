// Tests for GET /api/profile/resume: the file is found through the caller's
// own resume row, never through a client-supplied path.
import path from "path";

const { existsSync, readFileSync } = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
  default: { existsSync, readFileSync },
  existsSync,
  readFileSync,
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  default: { resume: { findUnique: vi.fn() } },
}));

vi.mock("next/server", () => ({
  NextResponse: class {
    status = 200;
    body: unknown;
    headers: Record<string, string>;
    constructor(body: unknown, init?: { headers?: Record<string, string> }) {
      this.body = body;
      this.headers = init?.headers ?? {};
    }
    static json(data: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => data };
    }
  },
}));

import { GET } from "@/app/api/profile/resume/route";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";

const db = prisma as any;
const resumesDir = path.join(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
const req = (query: string) =>
  ({ url: `http://localhost/api/profile/resume?${query}` }) as any;
const withFile = (filePath: string) =>
  db.resume.findUnique.mockResolvedValue({ File: { filePath } });

describe("GET /api/profile/resume", () => {
  beforeEach(() => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(Buffer.from("%PDF"));
  });

  it("streams the file attached to the caller's own resume", async () => {
    withFile(path.join(resumesDir, "cv.pdf"));

    const res: any = await GET(req("resumeId=r1"));

    expect(db.resume.findUnique).toHaveBeenCalledWith({
      where: { id: "r1", profile: { userId: "user-1" } },
      select: { File: { select: { filePath: true } } },
    });
    expect(res.status).toBe(200);
    expect(res.headers["Content-Disposition"]).toBe(
      'attachment; filename="cv.pdf"',
    );
  });

  it("returns 404 for a resume the caller does not own", async () => {
    db.resume.findUnique.mockResolvedValue(null);

    const res: any = await GET(req("resumeId=someone-elses"));

    expect(res.status).toBe(404);
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it("ignores a filePath query param", async () => {
    const res: any = await GET(req("filePath=%2Fdata%2Fsecret.pdf"));

    expect(res.status).toBe(400);
    expect(db.resume.findUnique).not.toHaveBeenCalled();
    expect(existsSync).not.toHaveBeenCalled();
  });

  it.each([
    path.join(APP_CONSTANTS.UPLOADS_DIR, "backups", "cv.pdf"),
    path.join(`${resumesDir}-old`, "cv.pdf"),
    "/etc/cv.pdf",
  ])("refuses a stored path outside the resumes directory: %s", async (filePath) => {
    withFile(filePath);

    const res: any = await GET(req("resumeId=r1"));

    expect(res.status).toBe(404);
    expect(readFileSync).not.toHaveBeenCalled();
  });
});
