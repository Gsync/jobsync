import db from "@/lib/db";
import { collectBackupData } from "@/lib/backup/export";
import { MODEL_SPECS, INSERT_ORDER } from "@/lib/backup/ordering";

vi.mock("@/lib/db", () => {
  const delegate = () => ({ findMany: vi.fn().mockResolvedValue([]) });
  const mock: Record<string, unknown> = {
    // $transaction receives an array of already-resolved promises here because
    // the mocked delegates return plain promises.
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    user: { findUnique: vi.fn().mockResolvedValue({ defaultResumeId: null }) },
    jobStatus: { findMany: vi.fn().mockResolvedValue([]) },
  };
  for (const key of [
    "company", "jobTitle", "location", "jobSource", "tag", "activityType",
    "profile", "file", "resume", "contactInfo", "summary", "resumeSection",
    "workExperience", "education", "licenseOrCertification", "otherSection",
    "skill", "coverLetter", "automation", "job", "note", "interview",
    "contact", "contactRole", "jobContact", "task", "activity", "question", "automationRun", "userSettings",
  ]) {
    mock[key] = delegate();
  }
  return { default: mock };
});

const mockDb = db as unknown as Record<string, { findMany: ReturnType<typeof vi.fn> }>;

describe("collectBackupData", () => {
  it("scopes every read to the user with the model's ownership chain", async () => {
    await collectBackupData("user-1");
    for (const model of INSERT_ORDER) {
      const spec = MODEL_SPECS[model];
      const call = mockDb[spec.delegate].findMany.mock.calls[0][0];
      expect(call.where, `${model} was not scoped`).toEqual(
        spec.scope("user-1"),
      );
    }
  });

  it("replaces Job.statusId with the status value and drops userId", async () => {
    mockDb.job.findMany.mockResolvedValueOnce([
      {
        id: "j1",
        userId: "user-1",
        statusId: "status-row-1",
        Status: { value: "applied" },
        description: "d",
        jobType: "full-time",
        workplaceType: null,
        jobUrl: null,
        createdAt: new Date("2026-01-01"),
        applied: true,
        appliedDate: null,
        dueDate: null,
        jobTitleId: "t1",
        companyId: "c1",
        jobSourceId: null,
        salaryRange: null,
        locationId: null,
        resumeId: null,
        coverLetterId: null,
        automationId: null,
        matchScore: null,
        matchData: null,
        discoveryStatus: null,
        discoveredAt: null,
        createdVia: null,
        descriptionCompleteness: null,
        tags: [{ id: "tag-1" }],
      },
    ]);

    const data = await collectBackupData("user-1");

    expect(data.Job[0].statusValue).toBe("applied");
    expect(data.Job[0]).not.toHaveProperty("statusId");
    expect(data.Job[0]).not.toHaveProperty("userId");
    expect(data.Job[0]).not.toHaveProperty("Status");
    expect(data.Job[0]).not.toHaveProperty("tags");
  });

  it("lifts job and question tag links into the join-table groups", async () => {
    mockDb.job.findMany.mockResolvedValueOnce([
      {
        id: "j1", userId: "u", statusId: "s", Status: { value: "new" },
        description: "d", jobType: "full-time", workplaceType: null, jobUrl: null,
        createdAt: new Date(), applied: false, appliedDate: null, dueDate: null,
        jobTitleId: "t1", companyId: "c1", jobSourceId: null, salaryRange: null,
        locationId: null, resumeId: null, coverLetterId: null, automationId: null,
        matchScore: null, matchData: null, discoveryStatus: null,
        discoveredAt: null, createdVia: null, descriptionCompleteness: null,
        tags: [{ id: "tag-1" }, { id: "tag-2" }],
      },
    ]);
    mockDb.question.findMany.mockResolvedValueOnce([
      {
        id: "q1", createdBy: "u", question: "why?", answer: null,
        createdAt: new Date(), updatedAt: new Date(), createdVia: null,
        tags: [{ id: "tag-2" }],
      },
    ]);

    const data = await collectBackupData("user-1");

    expect(data._JobToTag).toEqual([
      { jobId: "j1", tagId: "tag-1" },
      { jobId: "j1", tagId: "tag-2" },
    ]);
    expect(data._QuestionToTag).toEqual([{ questionId: "q1", tagId: "tag-2" }]);
    expect(data.Question[0]).not.toHaveProperty("tags");
  });

  it("carries the referenced job statuses as label/value pairs", async () => {
    (db as unknown as { jobStatus: { findMany: ReturnType<typeof vi.fn> } })
      .jobStatus.findMany.mockResolvedValueOnce([
        { label: "Applied", value: "applied" },
      ]);
    const data = await collectBackupData("user-1");
    expect(data.jobStatuses).toEqual([{ label: "Applied", value: "applied" }]);
  });

  it("carries defaultResumeId in its own group", async () => {
    (db as unknown as { user: { findUnique: ReturnType<typeof vi.fn> } })
      .user.findUnique.mockResolvedValueOnce({ defaultResumeId: "r1" });
    const data = await collectBackupData("user-1");
    expect(data.user).toEqual({ defaultResumeId: "r1" });
  });
});
