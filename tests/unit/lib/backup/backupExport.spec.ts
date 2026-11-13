import fs from "fs";
import os from "os";
import path from "path";
import JSZip from "jszip";
import db from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { buildBackupZip, collectBackupData } from "@/lib/backup/export";
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
    "skill", "coverLetter", "automation", "job", "note",
    "contact", "contactRole", "jobContact", "jobStageType", "jobStage",
    "jobStageInterviewer", "jobStagePrepQuestion",
    "task", "activity", "question", "automationRun", "userSettings",
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

  // D3: a raw statusId points at nothing after a restore into a fresh database.
  it("replaces JobStageType.statusId with the status value and drops createdBy", async () => {
    mockDb.jobStageType.findMany.mockResolvedValueOnce([
      {
        id: "t1",
        label: "Final / Onsite Interview",
        value: "final / onsite interview",
        statusId: "status-row-1",
        Status: { value: "interview" },
        sortOrder: 6,
        createdBy: "user-1",
      },
    ]);

    const data = await collectBackupData("user-1");

    expect(data.JobStageType[0].statusValue).toBe("interview");
    expect(data.JobStageType[0]).not.toHaveProperty("statusId");
    expect(data.JobStageType[0]).not.toHaveProperty("Status");
    expect(data.JobStageType[0]).not.toHaveProperty("createdBy");
  });

  // A seeded Withdrawn stage type predates any withdrawn job, so scoping this
  // read to the user's jobs alone would leave its statusValue unresolvable.
  it("reads the statuses reached by a stage type as well as by a job", async () => {
    await collectBackupData("user-1");
    const call = (db as unknown as { jobStatus: { findMany: ReturnType<typeof vi.fn> } })
      .jobStatus.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      OR: [
        { jobs: { some: { userId: "user-1" } } },
        { stageTypes: { some: { createdBy: "user-1" } } },
      ],
    });
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

describe("buildBackupZip", () => {
  const originalUploads = APP_CONSTANTS.UPLOADS_DIR;
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobsync-export-"));
    (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = tmp;
  });

  afterEach(() => {
    (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = originalUploads;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("never reads a stored path outside the resumes directory", async () => {
    const inside = path.join(tmp, "files", "resumes", "cv.pdf");
    const outside = path.join(tmp, "dev.db");
    fs.mkdirSync(path.dirname(inside), { recursive: true });
    fs.writeFileSync(inside, "%PDF-1.4 cv");
    fs.writeFileSync(outside, "every user's data");
    const uploadedAt = new Date("2026-01-01");
    mockDb.file.findMany.mockResolvedValueOnce([
      { id: "f1", fileName: "cv.pdf", filePath: inside, fileType: "application/pdf", uploadedAt },
      { id: "f2", fileName: "dev.db", filePath: outside, fileType: "resume", uploadedAt },
    ]);

    const { buffer } = await buildBackupZip("user-1", "owner@example.com");

    const zip = await JSZip.loadAsync(buffer);
    const data = JSON.parse(await zip.file("data.json")!.async("string"));
    const byId = (id: string) => data.File.find((f: { id: string }) => f.id === id);
    expect(zip.file("files/f1/cv.pdf")).not.toBeNull();
    expect(Object.keys(zip.files).some((n) => n.startsWith("files/f2/"))).toBe(false);
    expect(byId("f1").fileMissing).toBeUndefined();
    expect(byId("f2").fileMissing).toBe(true);
  });
});
