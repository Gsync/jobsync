import { describe, expect, it, vi } from "vitest";
import type {
  ContactInfo,
  Resume,
  ResumeSection,
} from "@/models/profile.model";

// The predicate lives beside the export hook, which pulls the router and the
// toast layer at module scope. Neither is exercised here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

import { canExportResume } from "@/components/profile/resume-container/useResumePdfExport";

const base: Resume = { id: "r1", title: "My Resume" };

describe("canExportResume", () => {
  it("is false for a resume with no contact name and no sections", () => {
    expect(canExportResume(base)).toBe(false);
  });

  it("is false when the contact name is only whitespace", () => {
    expect(
      canExportResume({
        ...base,
        ContactInfo: { firstName: "  ", lastName: "\t" } as ContactInfo,
      }),
    ).toBe(false);
  });

  it("is true with only a first name", () => {
    expect(
      canExportResume({
        ...base,
        ContactInfo: { firstName: "Ada" } as ContactInfo,
      }),
    ).toBe(true);
  });

  it("is true with only a last name", () => {
    expect(
      canExportResume({
        ...base,
        ContactInfo: { lastName: "Lovelace" } as ContactInfo,
      }),
    ).toBe(true);
  });

  it("is true with a summary section and no contact name", () => {
    expect(
      canExportResume({
        ...base,
        ResumeSections: [
          { summary: { content: "<p>Hi</p>" } } as ResumeSection,
        ],
      }),
    ).toBe(true);
  });

  it("is true for each of the other content-bearing section shapes", () => {
    const shapes = [
      { workExperiences: [{}] },
      { educations: [{}] },
      { licenseOrCertifications: [{}] },
      { skills: [{}] },
    ];
    for (const shape of shapes) {
      expect(
        canExportResume({
          ...base,
          ResumeSections: [shape as unknown as ResumeSection],
        }),
      ).toBe(true);
    }
  });

  it("is false for sections that exist but hold nothing", () => {
    expect(
      canExportResume({
        ...base,
        ResumeSections: [
          {
            workExperiences: [],
            educations: [],
            skills: [],
          } as unknown as ResumeSection,
        ],
      }),
    ).toBe(false);
  });
});
