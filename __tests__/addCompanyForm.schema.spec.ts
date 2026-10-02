import { AddCompanyFormSchema } from "@/models/addCompanyForm.schema";

describe("AddCompanyFormSchema", () => {
  describe("company field", () => {
    it("should accept valid company name", () => {
      const validData = {
        company: "Tech Company Inc.",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.company).toBe("Tech Company Inc.");
    });

    it("should reject empty company name", () => {
      const invalidData = {
        company: "",
      };

      expect(() => AddCompanyFormSchema.parse(invalidData)).toThrow();
    });
  });

  describe("logoUrl field", () => {
    it("should accept valid https URL", () => {
      const validData = {
        company: "Tech Company",
        logoUrl: "https://example.com/logo.png",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe("https://example.com/logo.png");
    });

    it("should accept valid http URL", () => {
      const validData = {
        company: "Tech Company",
        logoUrl: "http://example.com/logo.png",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe("http://example.com/logo.png");
    });

    it("should accept empty logoUrl", () => {
      const validData = {
        company: "Tech Company",
        logoUrl: "",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe("");
    });

    it("should default to empty string when logoUrl is undefined", () => {
      const validData = {
        company: "Tech Company",
      };

      const result = AddCompanyFormSchema.parse(validData);
      // Due to the .default("") in the schema, undefined becomes ""
      expect(result.logoUrl).toBe("");
    });

    it("should reject malformed URL", () => {
      const invalidData = {
        company: "Tech Company",
        logoUrl: "not a valid url",
      };

      expect(() => AddCompanyFormSchema.parse(invalidData)).toThrow(
        "Please enter a valid URL",
      );
    });

    it("should accept URL with query parameters", () => {
      const validData = {
        company: "Tech Company",
        logoUrl:
          "https://example.com/image.png?width=200&height=200&format=png",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe(
        "https://example.com/image.png?width=200&height=200&format=png",
      );
    });

    it("should accept URL with fragments", () => {
      const validData = {
        company: "Tech Company",
        logoUrl: "https://example.com/logo.png#section",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe("https://example.com/logo.png#section");
    });

    it("should accept URL with subdomain", () => {
      const validData = {
        company: "Tech Company",
        logoUrl: "https://cdn.example.com/logo.png",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe("https://cdn.example.com/logo.png");
    });

    it("should accept URL with port", () => {
      const validData = {
        company: "Tech Company",
        logoUrl: "https://example.com:8080/logo.png",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.logoUrl).toBe("https://example.com:8080/logo.png");
    });
  });

  describe("websiteUrl and careersUrl fields", () => {
    it("accepts an absolute https URL", () => {
      const result = AddCompanyFormSchema.parse({
        company: "Tech Company",
        websiteUrl: "https://example.com",
        careersUrl: "https://example.com/careers",
      });
      expect(result.websiteUrl).toBe("https://example.com");
      expect(result.careersUrl).toBe("https://example.com/careers");
    });

    it("accepts empty values", () => {
      const result = AddCompanyFormSchema.parse({
        company: "Tech Company",
        websiteUrl: "",
        careersUrl: "",
      });
      expect(result.websiteUrl).toBe("");
    });

    it("rejects a site-relative path as a website", () => {
      expect(() =>
        AddCompanyFormSchema.parse({
          company: "Tech Company",
          websiteUrl: "/careers",
        }),
      ).toThrow();
    });

    it("rejects a non-http protocol", () => {
      expect(() =>
        AddCompanyFormSchema.parse({
          company: "Tech Company",
          careersUrl: "ftp://example.com/jobs",
        }),
      ).toThrow();
    });

    it("still accepts a site-relative logo path", () => {
      const result = AddCompanyFormSchema.parse({
        company: "Tech Company",
        logoUrl: "/icons/logo.svg",
      });
      expect(result.logoUrl).toBe("/icons/logo.svg");
    });
  });

  describe("industry field", () => {
    it("accepts free text", () => {
      const result = AddCompanyFormSchema.parse({
        company: "Tech Company",
        industry: "Financial Services",
      });
      expect(result.industry).toBe("Financial Services");
    });
  });

  describe("optional fields", () => {
    it("should accept id field", () => {
      const validData = {
        id: "company-123",
        company: "Tech Company",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.id).toBe("company-123");
    });

    it("should accept createdBy field", () => {
      const validData = {
        createdBy: "user-123",
        company: "Tech Company",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result.createdBy).toBe("user-123");
    });

    it("should accept all fields together", () => {
      const validData = {
        id: "company-123",
        createdBy: "user-123",
        company: "Tech Company",
        logoUrl: "https://example.com/logo.png",
      };

      const result = AddCompanyFormSchema.parse(validData);
      expect(result).toEqual({
        ...validData,
        websiteUrl: "",
        careersUrl: "",
        industry: "",
        linkedinUrl: "",
        notes: "",
      });
    });
  });

  describe("linkedinUrl, size and notes fields", () => {
    it("accepts a LinkedIn URL, a listed size and notes", () => {
      const result = AddCompanyFormSchema.parse({
        company: "Tech Company",
        linkedinUrl: "https://www.linkedin.com/company/tech",
        size: "51-200",
        notes: "Good culture",
      });
      expect(result.linkedinUrl).toBe("https://www.linkedin.com/company/tech");
      expect(result.size).toBe("51-200");
      expect(result.notes).toBe("Good culture");
    });

    it("accepts an empty size", () => {
      const result = AddCompanyFormSchema.parse({
        company: "Tech Company",
        size: "",
      });
      expect(result.size).toBe("");
    });

    it("rejects a non-http LinkedIn URL", () => {
      expect(() =>
        AddCompanyFormSchema.parse({
          company: "Tech Company",
          linkedinUrl: "linkedin.com/company/tech",
        }),
      ).toThrow();
    });

    it("rejects a size outside the listed bands", () => {
      expect(() =>
        AddCompanyFormSchema.parse({ company: "Tech Company", size: "huge" }),
      ).toThrow();
    });

    it("rejects notes over the length cap", () => {
      expect(() =>
        AddCompanyFormSchema.parse({
          company: "Tech Company",
          notes: "x".repeat(5001),
        }),
      ).toThrow();
    });
  });
});
