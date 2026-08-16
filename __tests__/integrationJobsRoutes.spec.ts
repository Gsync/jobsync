import { authorizeIntegrationRead } from "@/lib/jobs/integrationRoute";
import {
  getIntegrationResumeSnapshot,
  getOwnedIntegrationJob,
  listIntegrationJobs,
} from "@/lib/jobs/integrationRead";

vi.mock("@/lib/jobs/integrationRoute", () => ({
  authorizeIntegrationRead: vi.fn(),
}));

vi.mock("@/lib/jobs/integrationRead", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/jobs/integrationRead")>();
  return {
    ...actual,
    getIntegrationResumeSnapshot: vi.fn(),
    getOwnedIntegrationJob: vi.fn(),
    listIntegrationJobs: vi.fn(),
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { GET as listJobs } from "@/app/api/integrations/jobs/route";
import { GET as getJob } from "@/app/api/integrations/jobs/[id]/route";

describe("JobSync integration job routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authorizeIntegrationRead as any).mockResolvedValue({ userId: "user-1" });
  });

  it("returns a compact page and resume fingerprint without raw content", async () => {
    (listIntegrationJobs as any).mockResolvedValue({
      jobs: [{ id: "job-1", fingerprint: "job-hash", descriptionCompleteness: "full" }],
      nextCursor: null,
    });
    (getIntegrationResumeSnapshot as any).mockResolvedValue({
      id: "resume-1",
      title: "Default Resume",
      fingerprint: "resume-hash",
    });
    const request = { url: "https://jobsync.test/api/integrations/jobs?limit=25" } as Request;

    const response = await listJobs(request);
    if (!response) throw new Error("Expected response");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(listIntegrationJobs).toHaveBeenCalledWith("user-1", undefined, 25);
    expect(getIntegrationResumeSnapshot).toHaveBeenCalledWith("user-1", false);
    expect(data.jobs[0]).not.toHaveProperty("description");
    expect(data.defaultResume).not.toHaveProperty("content");
  });

  it("returns 400 for invalid pagination without querying jobs", async () => {
    const request = { url: "https://jobsync.test/api/integrations/jobs?limit=0" } as Request;

    const response = await listJobs(request);
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(400);
    expect(listIntegrationJobs).not.toHaveBeenCalled();
  });

  it("reads a job only through the authenticated user's owned lookup", async () => {
    (getOwnedIntegrationJob as any).mockResolvedValue({
      id: "job-1",
      jobUrl: null,
      title: "Staff Engineer",
      company: "Example Co",
      location: null,
      workplaceType: null,
      jobType: "full-time",
      salaryRange: null,
      descriptionCompleteness: "full",
      description: "Complete description",
      fingerprint: "job-hash",
    });
    (getIntegrationResumeSnapshot as any).mockResolvedValue({
      id: "resume-1",
      title: "Default Resume",
      fingerprint: "resume-hash",
      content: "Normalized resume",
    });

    const response = await getJob({} as Request, {
      params: Promise.resolve({ id: "job-1" }),
    });
    if (!response) throw new Error("Expected response");
    const data = await response.json();

    expect(getOwnedIntegrationJob).toHaveBeenCalledWith("user-1", "job-1");
    expect(data.job.jobUrl).toBeNull();
    expect(data.defaultResume.content).toBe("Normalized resume");
  });

  it("returns the same 404 for missing or foreign-owned job IDs", async () => {
    (getOwnedIntegrationJob as any).mockResolvedValue(null);

    const response = await getJob({} as Request, {
      params: Promise.resolve({ id: "foreign-job" }),
    });
    if (!response) throw new Error("Expected response");

    expect(response.status).toBe(404);
    expect(getIntegrationResumeSnapshot).not.toHaveBeenCalled();
  });
});
