import { describe, it, expect } from "vitest";
import {
  ImportContactInfoSchema,
  ImportExperienceSchema,
  ImportEducationSchema,
  ImportCertificationSchema,
  ResumeImportSchema,
} from "@/models/resumeImport.schema";

// --- ImportContactInfoSchema ---

describe("ImportContactInfoSchema", () => {
  it("accepts a fully populated contact object", () => {
    const result = ImportContactInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      headline: "Senior Engineer",
      email: "jane@example.com",
      phone: "555-1234",
      address: "Calgary, AB",
      confidence: "high",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (all fields optional)", () => {
    expect(ImportContactInfoSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid confidence values", () => {
    for (const confidence of ["high", "medium", "low"] as const) {
      expect(ImportContactInfoSchema.safeParse({ confidence }).success).toBe(true);
    }
  });

  it("rejects an invalid confidence value", () => {
    expect(
      ImportContactInfoSchema.safeParse({ confidence: "very-high" }).success,
    ).toBe(false);
  });
});

// --- ImportExperienceSchema ---

describe("ImportExperienceSchema", () => {
  it("accepts a full experience entry", () => {
    const result = ImportExperienceSchema.safeParse({
      company: "Acme Corp",
      jobTitle: "Backend Engineer",
      location: "Remote",
      startDate: "Jan 2020",
      endDate: "Present",
      description: "Built APIs.",
      confidence: "high",
    });
    expect(result.success).toBe(true);
  });

  it("requires company and jobTitle", () => {
    expect(ImportExperienceSchema.safeParse({ company: "Acme" }).success).toBe(false);
    expect(ImportExperienceSchema.safeParse({ jobTitle: "Eng" }).success).toBe(false);
    expect(ImportExperienceSchema.safeParse({}).success).toBe(false);
  });

  it("accepts when optional fields are omitted", () => {
    const result = ImportExperienceSchema.safeParse({
      company: "Acme",
      jobTitle: "Engineer",
    });
    expect(result.success).toBe(true);
  });

  it("treats date fields as raw strings (no date format enforcement)", () => {
    const result = ImportExperienceSchema.safeParse({
      company: "X",
      jobTitle: "Y",
      startDate: "2019",
      endDate: "Current",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBe("2019");
      expect(result.data.endDate).toBe("Current");
    }
  });
});

// --- ImportEducationSchema ---

describe("ImportEducationSchema", () => {
  it("accepts a full education entry", () => {
    const result = ImportEducationSchema.safeParse({
      institution: "University of Alberta",
      degree: "BSc",
      fieldOfStudy: "Computer Science",
      location: "Edmonton, AB",
      startDate: "Sep 2015",
      endDate: "Apr 2019",
      description: "Dean's List.",
      confidence: "medium",
    });
    expect(result.success).toBe(true);
  });

  it("requires institution", () => {
    expect(ImportEducationSchema.safeParse({ degree: "BSc" }).success).toBe(false);
    expect(ImportEducationSchema.safeParse({}).success).toBe(false);
  });

  it("accepts when only institution is provided", () => {
    expect(
      ImportEducationSchema.safeParse({ institution: "MIT" }).success,
    ).toBe(true);
  });
});

// --- ImportCertificationSchema ---

describe("ImportCertificationSchema", () => {
  it("accepts a full certification entry", () => {
    const result = ImportCertificationSchema.safeParse({
      title: "AWS Solutions Architect",
      organization: "Amazon",
      issueDate: "Jun 2023",
      expirationDate: "Jun 2026",
      credentialUrl: "https://credly.com/badges/abc",
      confidence: "low",
    });
    expect(result.success).toBe(true);
  });

  it("requires title", () => {
    expect(ImportCertificationSchema.safeParse({}).success).toBe(false);
    expect(
      ImportCertificationSchema.safeParse({ organization: "AWS" }).success,
    ).toBe(false);
  });

  it("accepts when only title is provided", () => {
    expect(
      ImportCertificationSchema.safeParse({ title: "AWS SAA" }).success,
    ).toBe(true);
  });
});

// --- ResumeImportSchema ---

describe("ResumeImportSchema", () => {
  it("accepts a fully populated import payload", () => {
    const result = ResumeImportSchema.safeParse({
      contactInfo: { firstName: "Jane", email: "jane@example.com" },
      summary: "Experienced engineer.",
      experience: [{ company: "Acme", jobTitle: "Engineer" }],
      education: [{ institution: "MIT" }],
      certifications: [{ title: "AWS SAA" }],
      unrecognizedSections: ["Skills", "Projects"],
    });
    expect(result.success).toBe(true);
  });

  it("defaults arrays to [] when omitted", () => {
    const result = ResumeImportSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experience).toEqual([]);
      expect(result.data.education).toEqual([]);
      expect(result.data.certifications).toEqual([]);
      expect(result.data.unrecognizedSections).toEqual([]);
    }
  });

  it("accepts when all top-level fields are omitted", () => {
    expect(ResumeImportSchema.safeParse({}).success).toBe(true);
  });

  it("rejects when an experience entry is missing required fields", () => {
    const result = ResumeImportSchema.safeParse({
      experience: [{ location: "Remote" }], // missing company and jobTitle
    });
    expect(result.success).toBe(false);
  });

  it("rejects when an education entry is missing institution", () => {
    const result = ResumeImportSchema.safeParse({
      education: [{ degree: "BSc" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when a certification entry is missing title", () => {
    const result = ResumeImportSchema.safeParse({
      certifications: [{ organization: "AWS" }],
    });
    expect(result.success).toBe(false);
  });

  it("preserves unrecognized section names as-is", () => {
    const result = ResumeImportSchema.safeParse({
      unrecognizedSections: ["Skills", "Publications", "Volunteering"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unrecognizedSections).toEqual([
        "Skills",
        "Publications",
        "Volunteering",
      ]);
    }
  });
});
