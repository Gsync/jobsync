import { AddExperienceFormSchema } from "@/models/addExperienceForm.schema";

describe("AddExperienceFormSchema date ordering", () => {
  const reversed = {
    title: "title-1",
    company: "company-1",
    location: "location-1",
    jobDescription: "Developed application features",
    startDate: new Date(2026, 10, 1),
    endDate: new Date(2014, 10, 12),
    currentJob: false,
  };

  it("rejects a reversed active date range on the ending field", () => {
    const result = AddExperienceFormSchema.safeParse(reversed);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected date-order validation to fail");
    expect(result.error.issues).toEqual([
      expect.objectContaining({
        path: ["endDate"],
        message: "End date must be on or after the start date",
      }),
    ]);
  });

  it("accepts the same calendar day with a later starting time", () => {
    const startDate = new Date(2026, 10, 1, 15, 30);
    const endDate = new Date(2026, 10, 1);
    const result = AddExperienceFormSchema.safeParse({ ...reversed, startDate, endDate });

    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(result.data.startDate).toEqual(startDate);
    expect(result.data.endDate).toEqual(endDate);
  });

  it("accepts an ending date after the starting date", () => {
    expect(AddExperienceFormSchema.safeParse({
      ...reversed,
      endDate: new Date(2026, 10, 2),
    }).success).toBe(true);
  });

  it("ignores a stale reversed date when the range is inactive", () => {
    expect(AddExperienceFormSchema.safeParse({
      ...reversed,
      currentJob: true,
    }).success).toBe(true);
  });

  it.each([null, undefined])("accepts absent optional dates (%s)", (date) => {
    expect(AddExperienceFormSchema.safeParse({
      ...reversed,
      endDate: date,
    }).success).toBe(true);
  });

  it("accepts an omitted ending date", () => {
    const input = { ...reversed };
    Reflect.deleteProperty(input, "endDate");
    expect(AddExperienceFormSchema.safeParse(input).success).toBe(true);
  });

  it("enforces ordering with an omitted toggle", () => {
    const input = { ...reversed };
    Reflect.deleteProperty(input, "currentJob");
    const result = AddExperienceFormSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected date-order validation to fail");
    expect(result.error.issues).toEqual([
      expect.objectContaining({
        path: ["endDate"],
        message: "End date must be on or after the start date",
      }),
    ]);
  });

  describe.each(["startDate", "endDate"])("invalid %s", (field) => {
    it.each([new Date(NaN), "2026-11-01"])(
      "rejects invalid date values even when the range is inactive (%s)",
      (date) => {
        const result = AddExperienceFormSchema.safeParse({
          ...reversed,
          currentJob: true,
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
});
