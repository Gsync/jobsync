import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  coerceResumeExportSettings,
  useResumeExportSettings,
} from "@/components/profile/resume-container/useResumeExportSettings";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  defaultResumeExportSettings,
  RESUME_TEMPLATE_DEFAULTS,
} from "@/models/resumeExport.model";

const KEY = APP_CONSTANTS.RESUME_EXPORT_SETTINGS_STORAGE_KEY;

beforeEach(() => {
  localStorage.clear();
});

describe("coerceResumeExportSettings", () => {
  it("falls back to the defaults for anything that is not an object", () => {
    for (const value of [null, undefined, 7, "simple", []]) {
      expect(coerceResumeExportSettings(value)).toEqual(
        defaultResumeExportSettings,
      );
    }
  });

  it("keeps every valid value", () => {
    const stored = {
      template: "professional",
      font: "times",
      fontSize: 12.5,
      lineHeight: 1.6,
      marginVertical: 30,
      marginHorizontal: 36,
      sectionSpacing: 14,
      entrySpacing: 10,
      showPageNumbers: false,
    };
    expect(coerceResumeExportSettings(stored)).toEqual(stored);
  });

  // Settings saved before the footer existed have no showPageNumbers key.
  it("turns page numbers on unless a boolean says otherwise", () => {
    for (const value of [undefined, "false", 0, null]) {
      expect(
        coerceResumeExportSettings({ showPageNumbers: value }).showPageNumbers,
      ).toBe(true);
    }
  });

  // A key written by an older build, or edited by hand, must never reach a
  // style sheet as an unknown token.
  it("drops a named value that is not one of its setting's options", () => {
    const coerced = coerceResumeExportSettings({
      template: "professional",
      font: "comic-sans",
    });
    expect(coerced.template).toBe("professional");
    expect(coerced.font).toBe("helvetica");
  });

  // paddingHorizontal: NaN reaches the PDF renderer. This is the guard.
  it("clamps or discards a numeric value that is out of range or not a number", () => {
    const coerced = coerceResumeExportSettings({
      fontSize: 900,
      lineHeight: -4,
      marginVertical: NaN,
      marginHorizontal: "48",
      sectionSpacing: null,
      entrySpacing: 10,
    });
    expect(coerced.fontSize).toBe(16);
    expect(coerced.lineHeight).toBe(1);
    expect(coerced.marginVertical).toBe(40);
    expect(coerced.marginHorizontal).toBe(48);
    expect(coerced.sectionSpacing).toBe(6);
    expect(coerced.entrySpacing).toBe(10);
  });

  it("rounds a stored value to its field's precision", () => {
    expect(
      coerceResumeExportSettings({ lineHeight: 1.4500000000000002 }).lineHeight,
    ).toBe(1.45);
  });

  it("fills in fields the stored object never had, from that template", () => {
    expect(coerceResumeExportSettings({ template: "professional" })).toEqual(
      RESUME_TEMPLATE_DEFAULTS.professional,
    );
  });

  it("ignores keys that are not settings", () => {
    const coerced = coerceResumeExportSettings({ zoom: 2, font: "courier" });
    expect(coerced).toEqual({
      ...defaultResumeExportSettings,
      font: "courier",
    });
  });

  // The preview cache key is JSON.stringify(settings), so order matters even
  // when the stored object was written with its keys in a different one.
  it("returns the defaults' key order whatever the stored order was", () => {
    const coerced = coerceResumeExportSettings({
      entrySpacing: 4,
      template: "professional",
      font: "times",
    });
    expect(Object.keys(coerced)).toEqual(
      Object.keys(defaultResumeExportSettings),
    );
  });
});

describe("useResumeExportSettings", () => {
  it("stays closed and not ready while the dialog is shut", () => {
    const { result } = renderHook(() => useResumeExportSettings(false));

    expect(result.current.ready).toBe(false);
    expect(result.current.settings).toEqual(defaultResumeExportSettings);
  });

  it("reads storage on open and reports ready", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...defaultResumeExportSettings, sectionSpacing: 18 }),
    );

    const { result } = renderHook(() => useResumeExportSettings(true));

    expect(result.current.ready).toBe(true);
    expect(result.current.settings.sectionSpacing).toBe(18);
  });

  it("re-seeds every other field when the template changes", () => {
    const { result } = renderHook(() => useResumeExportSettings(true));

    act(() => {
      result.current.setSettings({
        ...defaultResumeExportSettings,
        fontSize: 13,
        marginVertical: 60,
      });
    });
    act(() => {
      result.current.setSettings({
        ...result.current.settings,
        template: "professional",
      });
    });

    expect(result.current.settings).toEqual(
      RESUME_TEMPLATE_DEFAULTS.professional,
    );
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(
      RESUME_TEMPLATE_DEFAULTS.professional,
    );
  });

  it("keeps page numbers off across a template change", () => {
    const { result } = renderHook(() => useResumeExportSettings(true));

    act(() => {
      result.current.setSettings({
        ...defaultResumeExportSettings,
        showPageNumbers: false,
      });
    });
    act(() => {
      result.current.setSettings({
        ...result.current.settings,
        template: "professional",
      });
    });

    expect(result.current.settings).toEqual({
      ...RESUME_TEMPLATE_DEFAULTS.professional,
      showPageNumbers: false,
    });
  });

  it("resets to the current template's defaults, not Simple's", () => {
    const { result } = renderHook(() => useResumeExportSettings(true));

    act(() => {
      result.current.setSettings({
        ...defaultResumeExportSettings,
        template: "professional",
      });
    });
    act(() => {
      result.current.setSettings({
        ...result.current.settings,
        sectionSpacing: 30,
      });
    });
    act(() => result.current.reset());

    expect(result.current.settings).toEqual(
      RESUME_TEMPLATE_DEFAULTS.professional,
    );
  });

  it("writes through on every change", () => {
    const { result } = renderHook(() => useResumeExportSettings(true));

    act(() => {
      result.current.setSettings({
        ...defaultResumeExportSettings,
        marginHorizontal: 64,
      });
    });

    expect(result.current.settings.marginHorizontal).toBe(64);
    expect(JSON.parse(localStorage.getItem(KEY)!).marginHorizontal).toBe(64);
  });

  it("resets back to the defaults and persists that", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...defaultResumeExportSettings, font: "courier" }),
    );
    const { result } = renderHook(() => useResumeExportSettings(true));

    act(() => result.current.reset());

    expect(result.current.settings).toEqual(defaultResumeExportSettings);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(
      defaultResumeExportSettings,
    );
  });

  it("survives a corrupt stored value", () => {
    localStorage.setItem(KEY, "{not json");

    const { result } = renderHook(() => useResumeExportSettings(true));

    expect(result.current.settings).toEqual(defaultResumeExportSettings);
    expect(result.current.ready).toBe(true);
  });

  it("survives a stored value from an older build", () => {
    localStorage.setItem(KEY, JSON.stringify({ template: "professional" }));

    const { result } = renderHook(() => useResumeExportSettings(true));

    expect(result.current.settings).toEqual(
      RESUME_TEMPLATE_DEFAULTS.professional,
    );
  });
});
