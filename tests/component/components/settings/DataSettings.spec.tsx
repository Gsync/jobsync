import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataSettings from "@/components/settings/DataSettings";

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const preflight = {
  manifest: {
    formatVersion: 1,
    appVersion: "1.1.16",
    exportedAt: "2026-08-14T10:00:00.000Z",
    sourceEmail: "owner@example.com",
    counts: { Job: 12, Resume: 2 },
  },
  emailMatches: true,
  targetIsEmpty: false,
  targetCounts: { Job: 4, Resume: 1, Profile: 1, Task: 0, Activity: 0, Note: 0, Question: 0, Automation: 0, CoverLetter: 0 },
};

function mockFetch(body: unknown, ok = true) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function pickFile(name = "backup.zip") {
  return new File(["zip-bytes"], name, { type: "application/zip" });
}

describe("DataSettings", () => {
  it("warns that the export holds no credentials but does hold full text", () => {
    render(<DataSettings />);
    expect(screen.getByText(/no API keys/i)).toBeInTheDocument();
    expect(screen.getByText(/full text/i)).toBeInTheDocument();
  });

  it("shows the backup preview after a preflight, without importing", async () => {
    const fetchMock = mockFetch(preflight);
    render(<DataSettings />);

    await userEvent.upload(
      screen.getByLabelText(/backup file/i),
      pickFile(),
    );

    await waitFor(() => expect(screen.getByText(/12/)).toBeInTheDocument());
    const preflightCall = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/backup/import/preflight",
    );
    expect(preflightCall).toBeTruthy();
  });

  it("surfaces a source-email mismatch prominently", async () => {
    mockFetch({ ...preflight, emailMatches: false });
    render(<DataSettings />);
    await userEvent.upload(screen.getByLabelText(/backup file/i), pickFile());
    await waitFor(() =>
      expect(screen.getByText(/different account/i)).toBeInTheDocument(),
    );
  });

  it("states what will be destroyed before the import runs", async () => {
    mockFetch(preflight);
    render(<DataSettings />);
    await userEvent.upload(screen.getByLabelText(/backup file/i), pickFile());
    await waitFor(() => screen.getByRole("button", { name: /replace my data/i }));

    await userEvent.click(screen.getByRole("button", { name: /replace my data/i }));

    expect(await screen.findByText(/4 jobs/i)).toBeInTheDocument();
  });

  it("sends confirmWipe only after the confirmation is accepted", async () => {
    const fetchMock = mockFetch(preflight);
    render(<DataSettings />);
    await userEvent.upload(screen.getByLabelText(/backup file/i), pickFile());
    await waitFor(() => screen.getByRole("button", { name: /replace my data/i }));
    await userEvent.click(screen.getByRole("button", { name: /replace my data/i }));

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ counts: { Job: 12 }, filesWritten: 2 }),
    });
    await userEvent.click(
      screen.getByRole("button", { name: /delete everything and import/i }),
    );

    await waitFor(() => {
      const importCall = fetchMock.mock.calls.find((c) => c[0] === "/api/backup/import");
      expect(importCall).toBeTruthy();
    });
    const importCall = fetchMock.mock.calls.find((c) => c[0] === "/api/backup/import")!;
    const body = importCall[1].body as FormData;
    expect(body.get("confirmWipe")).toBe("true");
  });

  it("shows the error message the route returned", async () => {
    mockFetch({ error: "This backup was made by a different version of JobSync." }, false);
    render(<DataSettings />);
    await userEvent.upload(screen.getByLabelText(/backup file/i), pickFile());
    const { toastError } = await import("@/lib/toast");
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "This backup was made by a different version of JobSync.",
        expect.anything(),
      ),
    );
  });

  // The recovery surface. It only helps if it is visible and says which
  // snapshot is which, so both are asserted.
  it("lists snapshots with their date and contents", async () => {
    mockFetch([
      {
        id: "pre-import-2026-08-14T10-32-00-000Z.zip",
        exportedAt: "2026-08-14T10:32:00.000Z",
        appVersion: "1.1.16",
        counts: { Job: 47, Resume: 3 },
        sizeBytes: 2_400_000,
      },
    ]);
    render(<DataSettings />);
    expect(await screen.findByText(/undo an import/i)).toBeInTheDocument();
    expect(screen.getByText(/47 jobs, 3 resumes/i)).toBeInTheDocument();
  });

  it("posts the snapshot id only after the rollback is confirmed", async () => {
    const fetchMock = mockFetch([
      {
        id: "pre-import-2026-08-14T10-32-00-000Z.zip",
        exportedAt: "2026-08-14T10:32:00.000Z",
        appVersion: "1.1.16",
        counts: { Job: 47, Resume: 3 },
        sizeBytes: 2_400_000,
      },
    ]);
    render(<DataSettings />);
    await userEvent.click(await screen.findByRole("button", { name: /restore/i }));

    const rollbackCallBefore = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/backup/rollback",
    );
    expect(rollbackCallBefore).toBeFalsy();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ counts: { Job: 47 }, filesWritten: 3, snapshotPath: "x" }),
    });
    await userEvent.click(screen.getByRole("button", { name: /^roll back$/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backup/rollback",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const body = JSON.parse(
      fetchMock.mock.calls.find((c) => c[0] === "/api/backup/rollback")![1].body,
    );
    expect(body.snapshotId).toBe("pre-import-2026-08-14T10-32-00-000Z.zip");
  });
});
