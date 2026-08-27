import path from "path";
import { extractAttachedResumeText } from "@/lib/ai/import/read-resume-file";
import { APP_CONSTANTS } from "@/lib/constants";

const mockReadFile = vi.hoisted(() => vi.fn());
const mockExtractText = vi.hoisted(() => vi.fn());

vi.mock("fs/promises", () => ({
  readFile: mockReadFile,
  default: { readFile: mockReadFile },
}));

vi.mock("@/lib/ai/import/extract-text", () => ({
  extractText: mockExtractText,
}));

describe("extractAttachedResumeText", () => {
  const filePath = path.join(
    APP_CONSTANTS.UPLOADS_DIR,
    "files",
    "resumes",
    "resume.pdf",
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text from a file inside the uploads directory", async () => {
    mockReadFile.mockResolvedValue(Buffer.from("pdf"));
    mockExtractText.mockResolvedValue({
      success: true,
      data: { text: "Senior engineer", truncated: false },
    });

    await expect(extractAttachedResumeText(filePath)).resolves.toBe(
      "Senior engineer",
    );
    expect(mockReadFile).toHaveBeenCalledWith(path.resolve(filePath));
    expect(mockExtractText).toHaveBeenCalledWith(Buffer.from("pdf"));
  });

  it("does not read paths outside the uploads directory", async () => {
    await expect(
      extractAttachedResumeText("/tmp/not-a-resume.pdf"),
    ).resolves.toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("returns null when extraction fails", async () => {
    mockReadFile.mockResolvedValue(Buffer.from("pdf"));
    mockExtractText.mockResolvedValue({
      success: false,
      error: { code: "NO_TEXT", message: "No text" },
    });

    await expect(extractAttachedResumeText(filePath)).resolves.toBeNull();
  });
});
