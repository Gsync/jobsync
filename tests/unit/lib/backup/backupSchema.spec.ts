import {
  BACKUP_FORMAT_VERSION,
  ManifestSchema,
  BackupDataSchema,
} from "@/lib/backup/schema";
import { INSERT_ORDER } from "@/lib/backup/ordering";

const validManifest = {
  formatVersion: 1,
  appVersion: "1.1.16",
  exportedAt: "2026-08-14T10:00:00.000Z",
  sourceEmail: "a@b.com",
  counts: { Job: 3, Resume: 1 },
};

describe("manifest schema", () => {
  it("pins the format version at 1", () => {
    expect(BACKUP_FORMAT_VERSION).toBe(1);
  });

  it("accepts a well-formed manifest", () => {
    expect(ManifestSchema.parse(validManifest).appVersion).toBe("1.1.16");
  });

  it("rejects a different formatVersion", () => {
    const res = ManifestSchema.safeParse({ ...validManifest, formatVersion: 2 });
    expect(res.success).toBe(false);
  });

  it("rejects a manifest missing required fields", () => {
    const { sourceEmail, ...rest } = validManifest;
    expect(ManifestSchema.safeParse(rest).success).toBe(false);
  });
});

describe("data schema", () => {
  it("defaults every model group to an empty array", () => {
    const parsed = BackupDataSchema.parse({});
    for (const model of INSERT_ORDER) {
      expect(parsed[model]).toEqual([]);
    }
    expect(parsed._JobToTag).toEqual([]);
    expect(parsed._QuestionToTag).toEqual([]);
    expect(parsed.jobStatuses).toEqual([]);
    expect(parsed.user).toEqual({ defaultResumeId: null });
  });

  it("coerces ISO date strings back to Date objects", () => {
    const parsed = BackupDataSchema.parse({
      Job: [
        {
          id: "j1",
          jobUrl: null,
          description: "d",
          jobType: "full-time",
          workplaceType: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          applied: false,
          appliedDate: null,
          dueDate: null,
          statusValue: "new",
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
        },
      ],
    });
    expect(parsed.Job[0].createdAt).toBeInstanceOf(Date);
  });

  it("rejects a Job carrying statusId instead of statusValue", () => {
    const res = BackupDataSchema.safeParse({
      Job: [{ id: "j1", statusId: "s1", description: "d" }],
    });
    expect(res.success).toBe(false);
  });

  it("parses the join-table groups as id pairs", () => {
    const parsed = BackupDataSchema.parse({
      _JobToTag: [{ jobId: "j1", tagId: "t1" }],
      _QuestionToTag: [{ questionId: "q1", tagId: "t1" }],
    });
    expect(parsed._JobToTag).toEqual([{ jobId: "j1", tagId: "t1" }]);
    expect(parsed._QuestionToTag[0].questionId).toBe("q1");
  });

  it("carries jobStatuses as label/value pairs", () => {
    const parsed = BackupDataSchema.parse({
      jobStatuses: [{ label: "New", value: "new" }],
    });
    expect(parsed.jobStatuses[0].value).toBe("new");
  });
});

describe("stage groups", () => {
  // Zod strips unknown keys, so an older file carrying Interview and
  // interviewId still imports — which is right for a model with zero reads.
  it("silently drops a legacy Interview group and Contact.interviewId", () => {
    const parsed = BackupDataSchema.parse({
      Interview: [{ id: "i1", createdAt: "2026-01-01T00:00:00.000Z", jobId: "j1" }],
      Contact: [
        {
          id: "c1",
          name: "Pat",
          email: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          interviewId: "i1",
        },
      ],
    });
    expect(parsed).not.toHaveProperty("Interview");
    expect(parsed.Contact[0]).not.toHaveProperty("interviewId");
  });

  it("defaults every stage group to an empty array", () => {
    const parsed = BackupDataSchema.parse({});
    expect(parsed.JobStageType).toEqual([]);
    expect(parsed.JobStage).toEqual([]);
    expect(parsed.JobStageInterviewer).toEqual([]);
    expect(parsed.JobStagePrepQuestion).toEqual([]);
  });

  // D3: JobStatus ids differ between installs, so the status crosses by name.
  it("carries a stage type's parent status by value, not by id", () => {
    const parsed = BackupDataSchema.parse({
      JobStageType: [
        {
          id: "t1",
          label: "Final / Onsite Interview",
          value: "final / onsite interview",
          statusValue: "interview",
          sortOrder: 6,
        },
      ],
    });
    expect(parsed.JobStageType[0].statusValue).toBe("interview");
    expect(parsed.JobStageType[0]).not.toHaveProperty("statusId");
  });

  it("rejects a stage type that carries no statusValue", () => {
    expect(() =>
      BackupDataSchema.parse({
        JobStageType: [{ id: "t1", label: "X", value: "x", sortOrder: 0 }],
      }),
    ).toThrow();
  });

  it("accepts a stage with a null occurredAt and a full stage alike", () => {
    const parsed = BackupDataSchema.parse({
      JobStage: [
        {
          id: "s1",
          jobId: "j1",
          stageTypeId: "t1",
          occurredAt: null,
          isCurrent: true,
          outcome: null,
          notes: null,
          durationMins: null,
          format: null,
          location: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(parsed.JobStage[0].occurredAt).toBeNull();
    expect(parsed.JobStage[0].isCurrent).toBe(true);
  });
});
