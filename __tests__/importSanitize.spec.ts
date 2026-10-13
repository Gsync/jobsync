import { sanitizeRow, sanitizeString } from "../scripts/import/sanitize";

describe("sanitizeString", () => {
  it("strips NUL", () => {
    expect(sanitizeString("a\u0000b")).toBe("ab");
  });

  it("strips unpaired surrogates on either side", () => {
    expect(sanitizeString("a\uD83Db")).toBe("ab");
    expect(sanitizeString("a\uDE00b")).toBe("ab");
  });

  it("keeps a valid surrogate pair", () => {
    expect(sanitizeString("ok 😀")).toBe("ok 😀");
  });
});

describe("sanitizeRow", () => {
  it("returns the same object and reports nothing when clean", () => {
    const row = { id: "1", title: "Engineer", applied: true, createdAt: new Date(0) };
    const touched: string[] = [];
    expect(sanitizeRow(row, (c) => touched.push(c))).toBe(row);
    expect(touched).toEqual([]);
  });

  it("cleans string columns only and names each one", () => {
    const createdAt = new Date(0);
    const row = { id: "1", description: "pdf\u0000text", notes: "x\uD83D", salary: null, createdAt };
    const touched: string[] = [];
    const clean = sanitizeRow(row, (c) => touched.push(c));
    expect(clean).toEqual({ id: "1", description: "pdftext", notes: "x", salary: null, createdAt });
    expect(touched).toEqual(["description", "notes"]);
    expect(row.description).toBe("pdf\u0000text");
  });
});
