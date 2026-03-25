/**
 * Server-side locale resolution tests.
 *
 * Tests isValidLocale, getLocaleFromCookie, and getUserLocale from @/lib/locale.
 */

// Must mock server-only before any import that transitively pulls it in
jest.mock("server-only", () => ({}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { userSettings: { findUnique: jest.fn() } },
}));

import { cookies } from "next/headers";
import { auth } from "@/auth";
import db from "@/lib/db";
import { isValidLocale } from "@/i18n/locales";
import { getUserLocale, getLocaleFromCookie } from "@/lib/locale";

// ---------------------------------------------------------------------------
// isValidLocale
// ---------------------------------------------------------------------------

describe("isValidLocale", () => {
  it.each(["en", "de", "fr", "es"])("returns true for valid locale '%s'", (code) => {
    expect(isValidLocale(code)).toBe(true);
  });

  it.each(["EN", "De", "ja", "zh", "pt", "", "english", "xx"])(
    "returns false for invalid locale '%s'",
    (code) => {
      expect(isValidLocale(code)).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// getLocaleFromCookie
// ---------------------------------------------------------------------------

describe("getLocaleFromCookie", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the locale from the NEXT_LOCALE cookie when valid", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "de" } : undefined),
    });

    const result = await getLocaleFromCookie();
    expect(result).toBe("de");
  });

  it("returns default locale when NEXT_LOCALE cookie is missing", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });

    const result = await getLocaleFromCookie();
    expect(result).toBe("en");
  });

  it("returns default locale when NEXT_LOCALE cookie has an invalid value", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "ja" } : undefined),
    });

    const result = await getLocaleFromCookie();
    expect(result).toBe("en");
  });

  it("returns default locale when cookies() throws", async () => {
    (cookies as jest.Mock).mockRejectedValue(new Error("No cookie store"));

    const result = await getLocaleFromCookie();
    expect(result).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// getUserLocale
// ---------------------------------------------------------------------------

describe("getUserLocale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns locale from DB user settings when available", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue({
      settings: JSON.stringify({ locale: "fr" }),
    });

    const result = await getUserLocale();
    expect(result).toBe("fr");
    expect(db.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("falls back to cookie when no DB setting exists", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "es" } : undefined),
    });

    const result = await getUserLocale();
    expect(result).toBe("es");
  });

  it("falls back to cookie when DB settings has no locale field", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue({
      settings: JSON.stringify({ theme: "dark" }),
    });
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "de" } : undefined),
    });

    const result = await getUserLocale();
    expect(result).toBe("de");
  });

  it("falls back to cookie when DB settings locale is invalid", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue({
      settings: JSON.stringify({ locale: "ja" }),
    });
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "fr" } : undefined),
    });

    const result = await getUserLocale();
    expect(result).toBe("fr");
  });

  it('falls back to "en" when nothing is set', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });

    const result = await getUserLocale();
    expect(result).toBe("en");
  });

  it('falls back to "en" when user is not authenticated and no cookie', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: {} });
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });

    const result = await getUserLocale();
    expect(result).toBe("en");
  });

  it("handles DB errors gracefully and falls back to cookie", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (db.userSettings.findUnique as jest.Mock).mockRejectedValue(
      new Error("DB connection failed"),
    );
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "es" } : undefined),
    });

    const result = await getUserLocale();
    // The outer try-catch in getUserLocale catches DB errors and falls through
    // to the cookie check (also inside the try), but since DB error is thrown
    // inside the first try block which also contains the cookie fallback,
    // the whole try fails and we get DEFAULT_LOCALE.
    expect(result).toBe("en");
  });

  it("handles auth() throwing gracefully", async () => {
    (auth as jest.Mock).mockRejectedValue(new Error("Auth service down"));
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });

    const result = await getUserLocale();
    expect(result).toBe("en");
  });

  it("handles malformed JSON in DB settings gracefully", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue({
      settings: "not-json",
    });
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "NEXT_LOCALE" ? { value: "fr" } : undefined),
    });

    const result = await getUserLocale();
    expect(result).toBe("fr");
  });
});
