import { describe, it, expect } from "vitest";
import type { ContactInfo } from "@/models/profile.model";
import { buildContactParts } from "@/components/profile/pdf-contact-parts";

const contact = (patch: Partial<ContactInfo>) => patch as ContactInfo;

describe("buildContactParts", () => {
  it("returns an empty list for null or undefined", () => {
    expect(buildContactParts(null)).toEqual([]);
    expect(buildContactParts(undefined)).toEqual([]);
  });

  it("orders email, phone, address, url1, url2", () => {
    const parts = buildContactParts(
      contact({
        email: "ada@example.com",
        phone: "555-0100",
        address: "London",
        url1: "https://www.example.com/ada",
        url2: "http://github.com/ada",
      }),
    );
    expect(parts.map((p) => p.text)).toEqual([
      "ada@example.com",
      "555-0100",
      "London",
      "example.com/ada",
      "github.com/ada",
    ]);
  });

  // The display text drops the scheme and www; the href keeps them, so the
  // link still resolves.
  it("keeps the full URL as the href", () => {
    const [part] = buildContactParts(
      contact({ url1: "https://www.example.com/ada" }),
    );
    expect(part.href).toBe("https://www.example.com/ada");
  });

  it("gives non-URL parts no href", () => {
    const [part] = buildContactParts(contact({ email: "ada@example.com" }));
    expect(part.href).toBeUndefined();
  });

  it("skips every empty field", () => {
    expect(
      buildContactParts(contact({ email: "", phone: undefined, address: "" })),
    ).toEqual([]);
  });
});
