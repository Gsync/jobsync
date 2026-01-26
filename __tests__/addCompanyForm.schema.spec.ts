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
      expect(result).toEqual(validData);
    });
  });
});
