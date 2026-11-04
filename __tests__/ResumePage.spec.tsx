import ResumePage from "@/app/dashboard/profile/resume/[id]/page";
import { getResumeById } from "@/actions/profile.actions";
import { notFound } from "next/navigation";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/actions/profile.actions", () => ({
  getResumeById: vi.fn(),
  getDefaultResumeId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/components/profile/ResumeContainer", () => ({
  default: () => null,
}));

const renderPage = () => ResumePage({ params: Promise.resolve({ id: "gone" }) });

describe("ResumePage", () => {
  it("shows not-found for a resume that doesn't exist", async () => {
    vi.mocked(getResumeById).mockResolvedValue({ data: null, success: true });

    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders an existing resume", async () => {
    vi.mocked(getResumeById).mockResolvedValue({
      data: { id: "r1" },
      success: true,
    });

    await expect(renderPage()).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });
});
