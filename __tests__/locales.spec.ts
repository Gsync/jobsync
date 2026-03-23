import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_MAP,
  isValidLocale,
} from "@/i18n/locales";

describe("SUPPORTED_LOCALES", () => {
  it("contains exactly 4 locales", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(4);
  });

  it("includes en, de, fr, and es locale codes", () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("de");
    expect(codes).toContain("fr");
    expect(codes).toContain("es");
  });

  it("each locale has code, name, nativeName, and flag properties", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(locale).toHaveProperty("code");
      expect(locale).toHaveProperty("name");
      expect(locale).toHaveProperty("nativeName");
      expect(locale).toHaveProperty("flag");

      expect(typeof locale.code).toBe("string");
      expect(typeof locale.name).toBe("string");
      expect(typeof locale.nativeName).toBe("string");
      expect(typeof locale.flag).toBe("string");

      expect(locale.code.length).toBeGreaterThan(0);
      expect(locale.name.length).toBeGreaterThan(0);
      expect(locale.nativeName.length).toBeGreaterThan(0);
      expect(locale.flag.length).toBeGreaterThan(0);
    }
  });

  it("has correct structure for English locale", () => {
    const en = SUPPORTED_LOCALES.find((l) => l.code === "en");
    expect(en).toEqual({
      code: "en",
      name: "English",
      nativeName: "English",
      flag: "gb",
    });
  });

  it("has correct structure for German locale", () => {
    const de = SUPPORTED_LOCALES.find((l) => l.code === "de");
    expect(de).toEqual({
      code: "de",
      name: "German",
      nativeName: "Deutsch",
      flag: "de",
    });
  });

  it("has correct structure for French locale", () => {
    const fr = SUPPORTED_LOCALES.find((l) => l.code === "fr");
    expect(fr).toEqual({
      code: "fr",
      name: "French",
      nativeName: "Français",
      flag: "fr",
    });
  });

  it("has correct structure for Spanish locale", () => {
    const es = SUPPORTED_LOCALES.find((l) => l.code === "es");
    expect(es).toEqual({
      code: "es",
      name: "Spanish",
      nativeName: "Español",
      flag: "es",
    });
  });

  it("flag codes are lowercase ISO country codes", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(locale.flag).toMatch(/^[a-z]{2}$/);
    }
  });
});

describe("DEFAULT_LOCALE", () => {
  it('is "en"', () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("is a valid locale code in SUPPORTED_LOCALES", () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toContain(DEFAULT_LOCALE);
  });
});

describe("LOCALE_MAP", () => {
  it("is a Map instance", () => {
    expect(LOCALE_MAP).toBeInstanceOf(Map);
  });

  it("contains all supported locale codes as keys", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_MAP.has(locale.code)).toBe(true);
    }
  });

  it("has the same size as SUPPORTED_LOCALES", () => {
    expect(LOCALE_MAP.size).toBe(SUPPORTED_LOCALES.length);
  });

  it("maps locale codes to their full locale objects", () => {
    const en = LOCALE_MAP.get("en");
    expect(en).toBeDefined();
    expect(en?.name).toBe("English");
    expect(en?.nativeName).toBe("English");
    expect(en?.flag).toBe("gb");
  });

  it("returns undefined for unsupported locale codes", () => {
    expect(LOCALE_MAP.get("ja")).toBeUndefined();
    expect(LOCALE_MAP.get("zh")).toBeUndefined();
    expect(LOCALE_MAP.get("")).toBeUndefined();
  });
});

describe("isValidLocale", () => {
  it("returns true for all supported locale codes", () => {
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("de")).toBe(true);
    expect(isValidLocale("fr")).toBe(true);
    expect(isValidLocale("es")).toBe(true);
  });

  it("returns false for unsupported locale codes", () => {
    expect(isValidLocale("ja")).toBe(false);
    expect(isValidLocale("zh")).toBe(false);
    expect(isValidLocale("pt")).toBe(false);
    expect(isValidLocale("it")).toBe(false);
    expect(isValidLocale("ru")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidLocale("")).toBe(false);
  });

  it("returns false for locale codes with wrong case", () => {
    expect(isValidLocale("EN")).toBe(false);
    expect(isValidLocale("De")).toBe(false);
    expect(isValidLocale("FR")).toBe(false);
  });

  it("returns false for locale codes with extra characters", () => {
    expect(isValidLocale("en-US")).toBe(false);
    expect(isValidLocale("de-DE")).toBe(false);
    expect(isValidLocale("fr-FR")).toBe(false);
  });

  it("returns false for random strings", () => {
    expect(isValidLocale("xyz")).toBe(false);
    expect(isValidLocale("hello")).toBe(false);
    expect(isValidLocale("123")).toBe(false);
  });
});
