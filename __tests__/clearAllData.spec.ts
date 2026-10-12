import { clearAllDataAction } from "@/actions/mock.actions";
import db from "@/lib/db";
import { requireUser } from "@/actions/shared";

vi.mock("@/actions/shared", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user-1" }),
}));
vi.mock("@/lib/resumeFiles", () => ({
  removeResumeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => {
  const model = () => ({
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  });
  const mock: Record<string, unknown> = {
    user: { update: vi.fn() },
    jobStatus: { findMany: vi.fn().mockResolvedValue([{ id: "s1", value: "applied" }]) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mock)),
  };
  for (const key of [
    "company", "jobTitle", "location", "jobSource", "tag", "activityType",
    "profile", "file", "resume", "contactInfo", "summary", "resumeSection",
    "workExperience", "education", "licenseOrCertification", "otherSection",
    "skill", "coverLetter", "automation", "job", "note",
    "contact", "contactRole", "jobContact", "jobStageType", "jobStage",
    "jobStageInterviewer", "jobStagePrepQuestion",
    "task", "activity", "question", "userSettings", "chatConversation",
    "automationRun",
  ]) {
    mock[key] = model();
  }
  return { default: mock };
});

const mockDb = db as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

describe("clearAllDataAction", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await clearAllDataAction();
    expect(result.success).toBe(false);
    expect(mockDb.job.deleteMany).not.toHaveBeenCalled();
  });

  it("wipes the user's rows, keeps settings and reseeds lookups", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = await clearAllDataAction();
    expect(result.success).toBe(true);
    expect(requireUser).toHaveBeenCalled();
    expect(mockDb.job.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(mockDb.userSettings.deleteMany).not.toHaveBeenCalled();
    expect(mockDb.contactRole.createMany).toHaveBeenCalled();
    expect(mockDb.jobStageType.createMany).toHaveBeenCalled();
    expect(mockDb.jobSource.createMany).toHaveBeenCalled();
  });
});
