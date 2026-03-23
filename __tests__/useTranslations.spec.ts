import { renderHook } from "@testing-library/react";
import { useTranslations } from "@/i18n/use-translations";

describe("useTranslations", () => {
  const originalLang = document.documentElement.lang;

  afterEach(() => {
    // Restore the original lang attribute after each test
    document.documentElement.lang = originalLang;
  });

  it("returns an object with t function and locale string", () => {
    document.documentElement.lang = "en";
    const { result } = renderHook(() => useTranslations());

    expect(result.current).toHaveProperty("t");
    expect(result.current).toHaveProperty("locale");
    expect(typeof result.current.t).toBe("function");
    expect(typeof result.current.locale).toBe("string");
  });

  it("reads locale from document.documentElement.lang", () => {
    document.documentElement.lang = "de";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.locale).toBe("de");
  });

  it('defaults to "en" when document.documentElement.lang is empty', () => {
    document.documentElement.lang = "";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.locale).toBe("en");
  });

  it("t() returns translated value for a known key", () => {
    document.documentElement.lang = "en";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("nav.dashboard")).toBe("Dashboard");
    expect(result.current.t("common.save")).toBe("Save");
    expect(result.current.t("common.cancel")).toBe("Cancel");
  });

  it("t() returns German translations when locale is de", () => {
    document.documentElement.lang = "de";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("nav.myJobs")).toBe("Meine Jobs");
    expect(result.current.t("common.save")).toBe("Speichern");
  });

  it("t() returns French translations when locale is fr", () => {
    document.documentElement.lang = "fr";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("nav.dashboard")).toBe("Tableau de bord");
    expect(result.current.t("common.save")).toBe("Enregistrer");
  });

  it("t() returns Spanish translations when locale is es", () => {
    document.documentElement.lang = "es";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("nav.dashboard")).toBe("Panel");
    expect(result.current.t("common.save")).toBe("Guardar");
  });

  it("t() returns the key itself as fallback for an unknown key", () => {
    document.documentElement.lang = "en";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("nonexistent.key")).toBe("nonexistent.key");
    expect(result.current.t("totally.missing")).toBe("totally.missing");
  });

  it("t() falls back to English dictionary for unsupported locale", () => {
    document.documentElement.lang = "zz";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("nav.dashboard")).toBe("Dashboard");
    expect(result.current.t("common.save")).toBe("Save");
  });

  it("returns namespace translations (dashboard, jobs, activities, tasks)", () => {
    document.documentElement.lang = "en";
    const { result } = renderHook(() => useTranslations());

    expect(result.current.t("dashboard.title")).toBe("Dashboard");
    expect(result.current.t("jobs.title")).toBe("My Jobs");
    expect(result.current.t("activities.title")).toBe("Activities");
    expect(result.current.t("tasks.title")).toBe("My Tasks");
  });

  it("updates translations when locale changes between renders", () => {
    document.documentElement.lang = "en";
    const { result, rerender } = renderHook(() => useTranslations());

    expect(result.current.t("common.save")).toBe("Save");
    expect(result.current.locale).toBe("en");

    document.documentElement.lang = "de";
    rerender();

    expect(result.current.t("common.save")).toBe("Speichern");
    expect(result.current.locale).toBe("de");
  });
});
