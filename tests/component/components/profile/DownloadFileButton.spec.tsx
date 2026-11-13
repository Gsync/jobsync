import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DownloadFileButton } from "@/components/profile/DownloadFileButton";

const RESTORED_PATH =
  "data/files/resumes/00000000-0000-4000-8000-000000000000-Sample Resume_2026-01-01T00-00-00.pdf";

describe("DownloadFileButton", () => {
  let downloads: string[];

  beforeEach(() => {
    downloads = [];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"])),
    }) as unknown as typeof fetch;
    window.URL.createObjectURL = vi.fn(() => "blob:mock");
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves under the original upload name, not the stored path", async () => {
    render(
      DownloadFileButton(
        "resume-1",
        RESTORED_PATH,
        "Sample",
        "Sample Resume.pdf",
      ),
    );
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(downloads).toEqual(["Sample Resume.pdf"]),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/profile/resume?resumeId=resume-1",
      expect.anything(),
    );
  });

  it("falls back to the path basename when fileName is empty", async () => {
    render(DownloadFileButton("resume-1", RESTORED_PATH, "Sample", ""));
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(downloads).toEqual([RESTORED_PATH.split("/").pop()]),
    );
  });
});
