import { sanitizeString } from "@/lib/postgresText";

describe("sanitizeString", () => {
  it("removes NUL and lone surrogates Postgres cannot store", () => {
    expect(sanitizeString("a\u0000b\uD800c\uDC00d")).toBe("abcd");
  });

  it("keeps valid surrogate pairs and ordinary text", () => {
    expect(sanitizeString("Résumé 😀\n")).toBe("Résumé 😀\n");
  });
});
