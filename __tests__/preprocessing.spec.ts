import { convertResumeToText } from "@/lib/ai/tools/preprocessing";
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
