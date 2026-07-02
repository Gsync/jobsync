import { warnInsufficientResumeSections } from "@/utils/resumeSections.utils";
import { buildInsufficientSectionsMessage } from "@/lib/resumeSections";

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

describe("warnInsufficientResumeSections", () => {
  it("shows a destructive toast with the built message", () => {
    warnInsufficientResumeSections("setting this resume as default");

    expect(mockToast).toHaveBeenCalledWith({
      variant: "destructive",
      title: "Not enough content",
      description: buildInsufficientSectionsMessage(
        "setting this resume as default",
      ),
    });
  });

  it("forwards the hint through to the built message", () => {
    warnInsufficientResumeSections(
      "running a review",
      "e.g. Summary and Experience",
    );

    expect(mockToast).toHaveBeenCalledWith({
      variant: "destructive",
      title: "Not enough content",
      description: buildInsufficientSectionsMessage(
        "running a review",
        "e.g. Summary and Experience",
      ),
    });
  });
});
