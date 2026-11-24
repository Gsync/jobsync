import { ApiV1AddJobSchema } from "@/models/apiV1.schema";

const base = { company: "Acme", jobTitle: "Engineer" };

const paths = (body: unknown) =>
  ApiV1AddJobSchema.safeParse(body).error?.issues.map((i) => i.path.join("."));

const parse = (body: unknown) => ApiV1AddJobSchema.parse(body);

describe("ApiV1AddJobSchema", () => {
  it("parses the minimal body", () => {
    expect(parse(base)).toEqual({
      company: "Acme",
      jobTitle: "Engineer",
      jobDescription: "N/A",
    });
  });

  it("trims every string", () => {
    const data = parse({
      ...base,
      company: " Acme ",
      jobUrl: " https://x.test/j ",
      jobType: " full time ",
      via: " My script ",
    });
    expect(data.company).toBe("Acme");
    expect(data.jobUrl).toBe("https://x.test/j");
    expect(data.jobType).toBe("Full-time");
    expect(data.via).toBe("My script");
  });

  it("treats blank optionals as omitted", () => {
    const data = parse({
      ...base,
      location: "  ",
      source: "",
      via: " ",
      jobDescription: "   ",
      jobType: "",
    });
    expect(data.location).toBeUndefined();
    expect(data.source).toBeUndefined();
    expect(data.via).toBeUndefined();
    expect(data.jobType).toBeUndefined();
    expect(data.jobDescription).toBe("N/A");
  });

  it("rejects missing or unusable names", () => {
    expect(paths({ jobTitle: "Engineer" })).toEqual(["company"]);
    expect(paths({ company: "Acme" })).toEqual(["jobTitle"]);
    expect(paths({ ...base, company: "   " })).toEqual(["company"]);
    expect(paths({ ...base, company: "," })).toEqual(["company"]);
    expect(paths({ ...base, company: "&#44;" })).toEqual(["company"]);
    expect(paths({ ...base, company: "&nbsp;" })).toEqual(["company"]);
    expect(paths({ ...base, jobTitle: "," })).toEqual(["jobTitle"]);
    expect(paths({ ...base, location: "," })).toEqual(["location"]);
    expect(paths({ ...base, source: "," })).toEqual(["source"]);
  });

  it("enforces length bounds", () => {
    const bounds = {
      company: 200,
      jobTitle: 200,
      location: 200,
      source: 200,
      jobDescription: 50_000,
      via: 50,
    };
    for (const [field, max] of Object.entries(bounds)) {
      expect(paths({ ...base, [field]: "x".repeat(max + 1) })).toEqual([field]);
      expect(paths({ ...base, [field]: "x".repeat(max) })).toBeUndefined();
    }
  });

  it("rejects NUL characters", () => {
    for (const field of ["company", "location", "jobDescription", "salaryRange"]) {
      expect(paths({ ...base, [field]: "Ac\u0000me" })).toEqual([field]);
    }
  });

  it("does not throw on out-of-range entities", () => {
    for (const company of ["&#1114112;", "&#x110000;"]) {
      const result = ApiV1AddJobSchema.safeParse({ ...base, company });
      expect(result.success).toBe(true);
      expect(result.data?.company).toBe(company);
    }
  });

  it("accepts enum spellings", () => {
    expect(parse({ ...base, jobType: "full time" }).jobType).toBe("Full-time");
    expect(parse({ ...base, jobType: "FT" }).jobType).toBe("Full-time");
    expect(parse({ ...base, workplaceType: "on-site" }).workplaceType).toBe("Onsite");
    expect(parse({ ...base, workplaceType: "REMOTE" }).workplaceType).toBe("Remote");
    expect(parse({ ...base, status: "Applied" }).status).toBe("applied");
    expect(parse({ ...base, status: "OFFER-ACCEPTED" }).status).toBe("offer-accepted");
  });

  it("rejects unknown enum values", () => {
    expect(paths({ ...base, jobType: "Freelance" })).toEqual(["jobType"]);
    expect(paths({ ...base, workplaceType: "Space" })).toEqual(["workplaceType"]);
    expect(paths({ ...base, status: "hired" })).toEqual(["status"]);
  });

  it("rejects non-http URLs", () => {
    const rejected = [
      "javascript:alert(1)",
      "ftp://x.test/a",
      "not a url",
      "httpx://x.test/a",
      "xhttp://x.test/a",
    ];
    for (const jobUrl of rejected) {
      expect(paths({ ...base, jobUrl })).toEqual(["jobUrl"]);
    }
    expect(paths({ ...base, jobUrl: "http://x.test/a" })).toBeUndefined();
  });

  it("ignores unknown fields", () => {
    const data = parse({ ...base, userId: "attacker", tags: ["x"], foo: 1 });
    expect(data).not.toHaveProperty("userId");
    expect(data).not.toHaveProperty("tags");
    expect(data).not.toHaveProperty("foo");
  });

  it("rejects a non-object body", () => {
    for (const body of [null, [], "text"]) {
      expect(ApiV1AddJobSchema.safeParse(body).success).toBe(false);
    }
  });

  it("rejects a non-boolean allowDuplicate", () => {
    expect(paths({ ...base, allowDuplicate: "true" })).toEqual(["allowDuplicate"]);
  });
});
