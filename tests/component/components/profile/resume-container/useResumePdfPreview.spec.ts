import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactInfo, Resume } from "@/models/profile.model";
import {
  defaultResumeExportSettings,
  type ResumeExportSettings,
} from "@/models/resumeExport.model";

const { generateResumePdfBlob } = vi.hoisted(() => ({
  generateResumePdfBlob: vi.fn(),
}));

// The hook reaches the generator through `await import("../resume-pdf")`;
// both specifiers resolve to the same module id, so this intercepts it.
vi.mock("@/components/profile/resume-pdf", () => ({ generateResumePdfBlob }));

// canExportResume lives beside the export hook, which pulls the router and
// the toast layer at module scope. Neither is exercised here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

import { useResumePdfPreview } from "@/components/profile/resume-container/useResumePdfPreview";

const resume: Resume = {
  id: "r1",
  title: "My Resume",
  ContactInfo: { firstName: "Ada", lastName: "Lovelace" } as ContactInfo,
};

const emptyResume: Resume = { id: "r2", title: "Untouched" };

const simple: ResumeExportSettings = { ...defaultResumeExportSettings };
const professional: ResumeExportSettings = {
  ...defaultResumeExportSettings,
  template: "professional",
};

// Flushes pending microtasks (the dynamic import) and any expired timers.
const flush = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("useResumePdfPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    generateResumePdfBlob.mockReset();
    generateResumePdfBlob.mockImplementation(
      async (_resume: Resume, settings: ResumeExportSettings) => ({
        blob: new Blob([settings.template], { type: "application/pdf" }),
        filename: `My Resume - ${settings.template}.pdf`,
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates immediately when the dialog opens", async () => {
    const { result } = renderHook(() =>
      useResumePdfPreview(resume, simple, true),
    );

    await flush();

    expect(generateResumePdfBlob).toHaveBeenCalledTimes(1);
    expect(generateResumePdfBlob).toHaveBeenCalledWith(resume, simple);
    expect(result.current.blob).toBeInstanceOf(Blob);
    expect(result.current.filename).toBe("My Resume - simple.pdf");
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("generates nothing while the dialog is closed", async () => {
    const { result } = renderHook(() =>
      useResumePdfPreview(resume, simple, false),
    );

    await flush();

    expect(generateResumePdfBlob).not.toHaveBeenCalled();
    expect(result.current.blob).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it("generates nothing for a resume with no exportable content", async () => {
    const { result } = renderHook(() =>
      useResumePdfPreview(emptyResume, simple, true),
    );

    await flush();

    expect(generateResumePdfBlob).not.toHaveBeenCalled();
    expect(result.current.blob).toBeNull();
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("debounces a settings change by 250ms", async () => {
    const { rerender } = renderHook(
      ({ settings }: { settings: ResumeExportSettings }) =>
        useResumePdfPreview(resume, settings, true),
      { initialProps: { settings: simple } },
    );
    await flush();
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(1);

    rerender({ settings: professional });
    await flush(200);
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(1);

    await flush(50);
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(2);
    expect(generateResumePdfBlob).toHaveBeenLastCalledWith(resume, professional);
  });

  it("coalesces a burst of settings changes into one generation", async () => {
    const { rerender } = renderHook(
      ({ settings }: { settings: ResumeExportSettings }) =>
        useResumePdfPreview(resume, settings, true),
      { initialProps: { settings: simple } },
    );
    await flush();
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(1);

    // simple is already cached, so the middle rerender resolves instantly and
    // cancels the pending professional timer; only the last one survives.
    rerender({ settings: professional });
    rerender({ settings: simple });
    rerender({ settings: professional });
    await flush(250);

    expect(generateResumePdfBlob).toHaveBeenCalledTimes(2);
    expect(generateResumePdfBlob).toHaveBeenLastCalledWith(resume, professional);
  });

  it("serves an already-rendered configuration from cache", async () => {
    const { result, rerender } = renderHook(
      ({ settings }: { settings: ResumeExportSettings }) =>
        useResumePdfPreview(resume, settings, true),
      { initialProps: { settings: simple } },
    );
    await flush();

    rerender({ settings: professional });
    await flush(250);
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(2);
    expect(result.current.filename).toBe("My Resume - professional.pdf");

    rerender({ settings: simple });
    await flush(250);
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(2);
    expect(result.current.filename).toBe("My Resume - simple.pdf");
    expect(result.current.isGenerating).toBe(false);
  });

  it("clears the cache when the dialog closes", async () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useResumePdfPreview(resume, simple, open),
      { initialProps: { open: true } },
    );
    await flush();
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(1);

    rerender({ open: false });
    await flush();
    expect(result.current.blob).toBeNull();

    rerender({ open: true });
    await flush();
    expect(generateResumePdfBlob).toHaveBeenCalledTimes(2);
  });

  it("surfaces a generation failure as an error and stops generating", async () => {
    generateResumePdfBlob.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() =>
      useResumePdfPreview(resume, simple, true),
    );
    await flush();

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.blob).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it("shows a cached configuration instantly, without generating", async () => {
    const { result, rerender } = renderHook(
      ({ settings }: { settings: ResumeExportSettings }) =>
        useResumePdfPreview(resume, settings, true),
      { initialProps: { settings: simple } },
    );
    await flush();
    rerender({ settings: professional });
    await flush(250);

    rerender({ settings: simple });
    expect(result.current.filename).toBe("My Resume - simple.pdf");
    expect(result.current.isGenerating).toBe(false);
  });

  it("drops a stale run's result", async () => {
    let finishFirst!: (value: unknown) => void;
    generateResumePdfBlob.mockImplementationOnce(
      () => new Promise((resolve) => (finishFirst = resolve)),
    );
    const { result, rerender } = renderHook(
      ({ settings }: { settings: ResumeExportSettings }) =>
        useResumePdfPreview(resume, settings, true),
      { initialProps: { settings: simple } },
    );
    await flush();
    rerender({ settings: professional });
    await flush(250);
    expect(result.current.filename).toBe("My Resume - professional.pdf");

    await act(async () => {
      finishFirst({ blob: new Blob(["old"]), filename: "stale.pdf" });
    });
    expect(result.current.filename).toBe("My Resume - professional.pdf");
  });

  it("never shows the previous opening's preview after an edit", async () => {
    const { result, rerender } = renderHook(
      ({ settings, open }: { settings: ResumeExportSettings; open: boolean }) =>
        useResumePdfPreview(resume, settings, open),
      { initialProps: { settings: simple, open: true } },
    );
    await flush();
    rerender({ settings: simple, open: false });
    rerender({ settings: professional, open: true });
    expect(result.current.blob).toBeNull();
    expect(result.current.isGenerating).toBe(true);
    await flush();
    expect(result.current.filename).toBe("My Resume - professional.pdf");
  });

  it("keeps the cache-hit preview on screen while the next one generates", async () => {
    const modern: ResumeExportSettings = { ...simple, fontSize: 12 };
    const { result, rerender } = renderHook(
      ({ settings }: { settings: ResumeExportSettings }) =>
        useResumePdfPreview(resume, settings, true),
      { initialProps: { settings: simple } },
    );
    await flush();
    rerender({ settings: professional });
    await flush(250);
    rerender({ settings: simple });
    expect(result.current.filename).toBe("My Resume - simple.pdf");

    rerender({ settings: modern });
    await flush(100);
    expect(result.current.filename).toBe("My Resume - simple.pdf");
  });
});
