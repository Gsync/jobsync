import { convertResumeToText, preprocessText } from "@/lib/ai/tools/preprocessing";
import { Resume, SectionType } from "@/models/profile.model";

// Minimal resume fixture shared across tests
const baseResume: Resume = {
  id: "resume-1",
  title: "My Resume",
  ResumeSections: [],
};

describe("convertResumeToText - certification sections", () => {
  it("includes certification section with title and organization", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            {
              id: "cert-1",
              title: "AWS Certified Solutions Architect",
              organization: "Amazon Web Services",
            },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("## CERTIFICATIONS");
    expect(text).toContain("Title: AWS Certified Solutions Architect");
    expect(text).toContain("Organization: Amazon Web Services");
  });

  it("includes issue and expiration dates when present", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            {
              id: "cert-1",
              title: "AWS SAA",
              organization: "AWS",
              issueDate: new Date("2023-06-01"),
              expirationDate: new Date("2026-06-01"),
            },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("Issue Date:");
    expect(text).toContain("Expiration Date:");
  });

  it("shows 'No Expiration' when issueDate present but no expirationDate", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            {
              id: "cert-1",
              title: "AWS SAA",
              organization: "AWS",
              issueDate: new Date("2023-06-01"),
            },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("No Expiration");
  });

  it("omits date lines when no issueDate is provided", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            {
              id: "cert-1",
              title: "AWS SAA",
              organization: "AWS",
            },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).not.toContain("Issue Date:");
    expect(text).not.toContain("Expiration Date:");
    expect(text).not.toContain("No Expiration");
  });

  it("includes credential URL when present", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            {
              id: "cert-1",
              title: "AWS SAA",
              organization: "AWS",
              credentialUrl: "https://credly.com/badges/abc",
            },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("Credential URL: https://credly.com/badges/abc");
  });

  it("handles license section type with correct heading", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Licenses",
          sectionType: SectionType.LICENSE,
          licenseOrCertifications: [
            {
              id: "lic-1",
              title: "Professional Engineer",
              organization: "APEGA",
            },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("## LICENSES");
    expect(text).toContain("Title: Professional Engineer");
    expect(text).toContain("Organization: APEGA");
  });

  it("omits certification section when licenseOrCertifications is empty", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).not.toContain("## CERTIFICATIONS");
  });

  it("includes multiple certifications in the same section", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-1",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            { id: "cert-1", title: "AWS SAA", organization: "Amazon" },
            { id: "cert-2", title: "GCP Associate", organization: "Google" },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("Title: AWS SAA");
    expect(text).toContain("Title: GCP Associate");
    expect(text).toContain("Organization: Amazon");
    expect(text).toContain("Organization: Google");
  });

  it("includes certifications alongside other sections", async () => {
    const resume: Resume = {
      ...baseResume,
      ResumeSections: [
        {
          id: "sec-sum",
          resumeId: "resume-1",
          sectionTitle: "Summary",
          sectionType: SectionType.SUMMARY,
          summary: { content: "Experienced engineer." },
        },
        {
          id: "sec-cert",
          resumeId: "resume-1",
          sectionTitle: "Certifications",
          sectionType: SectionType.CERTIFICATION,
          licenseOrCertifications: [
            { id: "cert-1", title: "AWS SAA", organization: "Amazon" },
          ],
        },
      ],
    };

    const text = await convertResumeToText(resume);
    expect(text).toContain("## SUMMARY");
    expect(text).toContain("## CERTIFICATIONS");
    expect(text).toContain("Title: AWS SAA");
  });
});

// --- preprocessText ---

// Enough text to pass MIN_CHAR_COUNT (200) and contain resume-like structure
const VALID_RESUME_TEXT = `
Jane Doe
Senior Software Engineer
jane@example.com | 555-123-4567 | Calgary, AB

SUMMARY
Experienced backend engineer with 8 years building scalable distributed systems.
Passionate about clean code and developer tooling.

EXPERIENCE
Acme Corp — Senior Engineer (Jan 2020 – Present)
- Led migration of monolithic backend to microservices architecture.
- Reduced p99 latency by 40% through caching and query optimization.
- Mentored a team of 5 junior engineers.

Previous Co — Software Engineer (Mar 2016 – Dec 2019)
- Built REST APIs serving 10M requests per day.
- Improved CI pipeline build times by 60%.

EDUCATION
University of Alberta — BSc Computer Science (2012 – 2016)

CERTIFICATIONS
AWS Certified Solutions Architect — Amazon (Jun 2023)
`.trim();

describe("preprocessText", () => {
  it("returns success for valid resume text", async () => {
    const result = await preprocessText(VALID_RESUME_TEXT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.normalizedText).toBeTruthy();
      expect(result.data.isValid).toBe(true);
    }
  });

  it("returns error for text that is too short", async () => {
    const result = await preprocessText("Too short.");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toMatch(/short|minimum/i);
    }
  });

  it("returns error for empty string", async () => {
    const result = await preprocessText("");
    expect(result.success).toBe(false);
  });

  it("normalizes multiple consecutive spaces", async () => {
    const text = VALID_RESUME_TEXT.replace(/\s+/g, "   "); // add extra spaces
    const result = await preprocessText(text);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.normalizedText).not.toMatch(/   /); // no triple spaces
    }
  });

  it("includes metadata with word count", async () => {
    const result = await preprocessText(VALID_RESUME_TEXT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.wordCount).toBeGreaterThan(0);
    }
  });
});
