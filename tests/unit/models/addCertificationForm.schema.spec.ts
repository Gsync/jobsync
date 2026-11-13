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

describe("AddCertificationFormSchema date ordering", () => {
  const reversed = {
    title: "AWS SAA",
    organization: "Amazon",
    issueDate: new Date(2026, 10, 1),
    expirationDate: new Date(2014, 10, 12),
    noExpiration: false,
  };

  it("rejects a reversed active date range on the ending field", () => {
    const result = AddCertificationFormSchema.safeParse(reversed);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected date-order validation to fail");
    expect(result.error.issues).toEqual([
      expect.objectContaining({
        path: ["expirationDate"],
        message: "Expiration date must be on or after the issue date",
      }),
    ]);
  });

  it("accepts the same calendar day with a later starting time", () => {
    const issueDate = new Date(2026, 10, 1, 15, 30);
    const expirationDate = new Date(2026, 10, 1);
    const result = AddCertificationFormSchema.safeParse({ ...reversed, issueDate, expirationDate });

    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(result.data.issueDate).toEqual(issueDate);
    expect(result.data.expirationDate).toEqual(expirationDate);
  });

  it("accepts an ending date after the starting date", () => {
    expect(AddCertificationFormSchema.safeParse({
      ...reversed,
      expirationDate: new Date(2026, 10, 2),
    }).success).toBe(true);
  });

  it("ignores a stale reversed date when the range is inactive", () => {
    expect(AddCertificationFormSchema.safeParse({
      ...reversed,
      noExpiration: true,
    }).success).toBe(true);
  });

  it.each([null, undefined])("accepts absent optional dates (%s)", (date) => {
    expect(AddCertificationFormSchema.safeParse({
      ...reversed,
      expirationDate: date,
    }).success).toBe(true);
  });

  it("accepts an omitted ending date", () => {
    const input = { ...reversed };
    Reflect.deleteProperty(input, "expirationDate");
    expect(AddCertificationFormSchema.safeParse(input).success).toBe(true);
  });

  it("enforces ordering with an omitted toggle", () => {
    const input = { ...reversed };
    Reflect.deleteProperty(input, "noExpiration");
    const result = AddCertificationFormSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected date-order validation to fail");
    expect(result.error.issues).toEqual([
      expect.objectContaining({
        path: ["expirationDate"],
        message: "Expiration date must be on or after the issue date",
      }),
    ]);
  });

  describe.each(["issueDate", "expirationDate"])("invalid %s", (field) => {
    it.each([new Date(NaN), "2026-11-01"])(
      "rejects invalid date values even when the range is inactive (%s)",
      (date) => {
        const result = AddCertificationFormSchema.safeParse({
          ...reversed,
          noExpiration: true,
          [field]: date,
        });

        expect(result.success).toBe(false);
        if (result.success) throw new Error("Expected invalid date to fail");
        expect(result.error.issues).toEqual([
          expect.objectContaining({ path: [field] }),
        ]);
      },
    );
  });

  it.each([null, undefined])("accepts absent issue dates (%s)", (issueDate) => {
    expect(AddCertificationFormSchema.safeParse({
      ...reversed,
      issueDate,
    }).success).toBe(true);
    expect(AddCertificationFormSchema.safeParse({
      ...reversed,
      issueDate,
      expirationDate: issueDate,
    }).success).toBe(true);
  });

  it("accepts both dates omitted", () => {
    expect(AddCertificationFormSchema.safeParse({
      title: "AWS SAA",
      organization: "Amazon",
    }).success).toBe(true);
  });
});
