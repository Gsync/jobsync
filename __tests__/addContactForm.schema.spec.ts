import { AddContactFormSchema } from "@/models/addContactForm.schema";

const valid = { name: "Dave Patel" };

describe("AddContactFormSchema", () => {
  it("accepts a name on its own", () => {
    expect(AddContactFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(AddContactFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts an empty email, because a panelist is often just a name", () => {
    expect(
      AddContactFormSchema.safeParse({ ...valid, email: "" }).success,
    ).toBe(true);
  });

  it("rejects a malformed email when one is given", () => {
    expect(
      AddContactFormSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects a LinkedIn URL that is not http(s)", () => {
    expect(
      AddContactFormSchema.safeParse({ ...valid, linkedinUrl: "ftp://x.com" })
        .success,
    ).toBe(false);
  });

  it("rejects an overlap that ends before it starts", () => {
    const res = AddContactFormSchema.safeParse({
      ...valid,
      workedFrom: new Date("2021-01-01"),
      workedTo: new Date("2019-01-01"),
    });
    expect(res.success).toBe(false);
  });

  it("accepts an open-ended overlap", () => {
    expect(
      AddContactFormSchema.safeParse({
        ...valid,
        workedFrom: new Date("2019-01-01"),
      }).success,
    ).toBe(true);
  });
});
