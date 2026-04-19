import { AddCertificationFormSchema } from "@/models/addCertificationForm.schema";

describe("AddCertificationFormSchema", () => {
  describe("valid data", () => {
    it("should accept minimal required fields", () => {
      const data = { title: "AWS SAA", organization: "Amazon" };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.title).toBe("AWS SAA");
      expect(result.organization).toBe("Amazon");
    });

    it("should accept full data with all optional fields", () => {
      const issueDate = new Date("2024-01-15");
      const expirationDate = new Date("2027-01-15");
      const data = {
        id: "cert-1",
        resumeId: "resume-1",
        sectionId: "section-1",
        sectionTitle: "Certifications",
        title: "AWS Certified Solutions Architect",
        organization: "Amazon Web Services",
        issueDate,
        expirationDate,
        credentialUrl: "https://www.credly.com/badges/abc123",
        noExpiration: false,
      };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.title).toBe("AWS Certified Solutions Architect");
      expect(result.organization).toBe("Amazon Web Services");
      expect(result.issueDate).toEqual(issueDate);
      expect(result.expirationDate).toEqual(expirationDate);
      expect(result.credentialUrl).toBe("https://www.credly.com/badges/abc123");
    });

    it("should default sectionTitle to 'Certifications'", () => {
      const data = { title: "AWS SAA", organization: "Amazon" };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.sectionTitle).toBe("Certifications");
    });

    it("should default noExpiration to false", () => {
      const data = { title: "AWS SAA", organization: "Amazon" };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.noExpiration).toBe(false);
    });

    it("should accept noExpiration as true", () => {
      const data = {
        title: "AWS SAA",
        organization: "Amazon",
        noExpiration: true,
      };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.noExpiration).toBe(true);
    });

    it("should accept null dates", () => {
      const data = {
        title: "AWS SAA",
        organization: "Amazon",
        issueDate: null,
        expirationDate: null,
      };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.issueDate).toBeNull();
      expect(result.expirationDate).toBeNull();
    });

    it("should accept null credentialUrl", () => {
      const data = {
        title: "AWS SAA",
        organization: "Amazon",
        credentialUrl: null,
      };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.credentialUrl).toBeNull();
    });

    it("should accept minimum 2-char title", () => {
      const data = { title: "AB", organization: "Org" };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.title).toBe("AB");
    });

    it("should accept minimum 2-char organization", () => {
      const data = { title: "AWS SAA", organization: "AB" };
      const result = AddCertificationFormSchema.parse(data);
      expect(result.organization).toBe("AB");
    });
  });

  describe("invalid data", () => {
    it("should reject missing title", () => {
      const data = { organization: "Amazon" };
      expect(() => AddCertificationFormSchema.parse(data)).toThrow();
    });

    it("should reject missing organization", () => {
      const data = { title: "AWS SAA" };
      expect(() => AddCertificationFormSchema.parse(data)).toThrow();
    });

    it("should reject title shorter than 2 characters", () => {
      const data = { title: "A", organization: "Amazon" };
      expect(() => AddCertificationFormSchema.parse(data)).toThrow();
    });

    it("should reject organization shorter than 2 characters", () => {
      const data = { title: "AWS SAA", organization: "A" };
      expect(() => AddCertificationFormSchema.parse(data)).toThrow();
    });
  });
});
