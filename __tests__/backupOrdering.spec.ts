import {
  MODEL_SPECS,
  INSERT_ORDER,
  DELETE_ORDER,
  LOOKUP_MODELS,
  EMPTINESS_MODELS,
  type BackupModel,
} from "@/lib/backup/ordering";

describe("backup ordering", () => {
  it("lists every model in MODEL_SPECS exactly once in INSERT_ORDER", () => {
    const specKeys = Object.keys(MODEL_SPECS).sort();
    const orderKeys = [...INSERT_ORDER].sort();
    expect(orderKeys).toEqual(specKeys);
    expect(new Set(INSERT_ORDER).size).toBe(INSERT_ORDER.length);
  });

  it("inserts every foreign-key target before the model that references it", () => {
    const position = new Map<BackupModel, number>(
      INSERT_ORDER.map((m, i) => [m, i]),
    );
    for (const model of INSERT_ORDER) {
      for (const [field, target] of Object.entries(MODEL_SPECS[model].fks)) {
        expect(
          position.get(target)! < position.get(model)!,
          `${model}.${field} -> ${target} is inserted too late`,
        ).toBe(true);
      }
    }
  });

  it("deletes in the exact reverse of the insert order", () => {
    expect(DELETE_ORDER).toEqual([...INSERT_ORDER].reverse());
  });

  // The two edges the intuitive reading gets backwards.
  it("inserts Summary before ResumeSection, because ResumeSection holds summaryId", () => {
    expect(MODEL_SPECS.ResumeSection.fks.summaryId).toBe("Summary");
    expect(MODEL_SPECS.Summary.fks).toEqual({});
    expect(INSERT_ORDER.indexOf("Summary")).toBeLessThan(
      INSERT_ORDER.indexOf("ResumeSection"),
    );
  });

  it("remaps ContactInfo through resumeId, not resumeSectionId", () => {
    expect(MODEL_SPECS.ContactInfo.fks).toEqual({ resumeId: "Resume" });
    expect(MODEL_SPECS.ContactInfo.fks).not.toHaveProperty("resumeSectionId");
  });

  it("inserts ContactRole before JobContact, and Contact after Company and Location", () => {
    const at = (m: BackupModel) => INSERT_ORDER.indexOf(m);
    expect(at("ContactRole")).toBeLessThan(at("JobContact"));
    expect(at("Contact")).toBeLessThan(at("JobContact"));
    expect(at("Company")).toBeLessThan(at("Contact"));
    expect(at("Location")).toBeLessThan(at("Contact"));
  });

  it("scopes JobContact through the job, which is the only chain it has", () => {
    expect(MODEL_SPECS.JobContact.scope("u1")).toEqual({ Job: { userId: "u1" } });
    expect(MODEL_SPECS.JobContact.fks).toEqual({
      jobId: "Job",
      contactId: "Contact",
      roleId: "ContactRole",
    });
  });

  it("remaps both of Contact's company FKs, not just the current employer", () => {
    expect(MODEL_SPECS.Contact.fks).toEqual({
      interviewId: "Interview",
      companyId: "Company",
      locationId: "Location",
      workedAtCompanyId: "Company",
    });
  });

  it("marks exactly the seven lookup models, all owned by createdBy", () => {
    expect([...LOOKUP_MODELS].sort()).toEqual([
      "ActivityType",
      "Company",
      "ContactRole",
      "JobSource",
      "JobTitle",
      "Location",
      "Tag",
    ]);
    for (const model of LOOKUP_MODELS) {
      expect(MODEL_SPECS[model].owner).toBe("createdBy");
      expect(MODEL_SPECS[model].fks).toEqual({});
    }
  });

  it("scopes every model to a user, directly or through a relation chain", () => {
    for (const model of INSERT_ORDER) {
      const where = MODEL_SPECS[model].scope("user-1");
      expect(JSON.stringify(where)).toContain("user-1");
    }
  });

  it("scopes the models whose ownership chain is easy to get wrong", () => {
    expect(MODEL_SPECS.File.scope("u1")).toEqual({
      Resume: { profile: { userId: "u1" } },
    });
    expect(MODEL_SPECS.Summary.scope("u1")).toEqual({
      ResumeSection: { Resume: { profile: { userId: "u1" } } },
    });
    expect(MODEL_SPECS.ContactInfo.scope("u1")).toEqual({
      resume: { profile: { userId: "u1" } },
    });
    expect(MODEL_SPECS.Interview.scope("u1")).toEqual({ job: { userId: "u1" } });
    expect(MODEL_SPECS.AutomationRun.scope("u1")).toEqual({
      automation: { userId: "u1" },
    });
  });
});

describe("emptiness models", () => {
  it("counts content models only, so seeded JobSource rows do not demand a wipe", () => {
    expect([...EMPTINESS_MODELS].sort()).toEqual([
      "Activity",
      "Automation",
      "CoverLetter",
      "Job",
      "Note",
      "Profile",
      "Question",
      "Resume",
      "Task",
    ]);
  });

  it("includes no lookup model", () => {
    for (const model of LOOKUP_MODELS) {
      expect(EMPTINESS_MODELS).not.toContain(model);
    }
  });

  it("includes Profile, so an import cannot add a second one", () => {
    expect(EMPTINESS_MODELS).toContain("Profile");
  });
});
