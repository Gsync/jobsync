import JobDetailsPage from "@/app/dashboard/myjobs/[id]/page";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

const getJobDetails = vi.fn();

vi.mock("@/actions/job.actions", () => ({
  getJobDetails: (id: string) => getJobDetails(id),
  getJobSourceList: vi.fn(async () => []),
  getStatusList: vi.fn(async () => []),
}));

vi.mock("@/actions/company.actions", () => ({
  getAllCompanies: vi.fn(async () => []),
}));

vi.mock("@/actions/jobtitle.actions", () => ({
  getAllJobTitles: vi.fn(async () => []),
}));

vi.mock("@/actions/jobLocation.actions", () => ({
  getAllJobLocations: vi.fn(async () => []),
}));

vi.mock("@/actions/tag.actions", () => ({
  getAllTags: vi.fn(async () => []),
}));

vi.mock("@/components/myjobs/JobDetails", () => ({
  default: () => <div data-testid="job-details" />,
}));

describe("JobDetailsPage", () => {
  beforeEach(() => {
    notFound.mockClear();
  });

  // A chat/tool-card link to a job that was later deleted lands here.
  it("renders not found when the job does not resolve for the user", async () => {
    getJobDetails.mockResolvedValue({ job: null, success: true });

    await expect(
      JobDetailsPage({ params: Promise.resolve({ id: "missing-job" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders not found when the fetch failed", async () => {
    getJobDetails.mockResolvedValue({ success: false, message: "boom" });

    await expect(
      JobDetailsPage({ params: Promise.resolve({ id: "any" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the job when it resolves", async () => {
    getJobDetails.mockResolvedValue({ job: { id: "job-1" }, success: true });

    await JobDetailsPage({ params: Promise.resolve({ id: "job-1" }) });
    expect(notFound).not.toHaveBeenCalled();
  });
});
