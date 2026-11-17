import { warnInsufficientResumeSections } from "@/utils/resumeSections.utils";
import { buildInsufficientSectionsMessage } from "@/lib/resumeSections";

const mockToastError = vi.fn();
vi.mock("@/lib/toast", () => ({
  toastError: (...args: any[]) => mockToastError(...args),
}));

describe("warnInsufficientResumeSections", () => {
  it("shows a destructive toast with the built message", () => {
    warnInsufficientResumeSections("setting this resume as default");

    expect(mockToastError).toHaveBeenCalledWith(
      buildInsufficientSectionsMessage("setting this resume as default"),
      "Not enough content",
    );
  });

  it("forwards the hint through to the built message", () => {
    warnInsufficientResumeSections(
      "running a review",
      "e.g. Summary and Experience",
    );

    expect(mockToastError).toHaveBeenCalledWith(
      buildInsufficientSectionsMessage(
        "running a review",
        "e.g. Summary and Experience",
      ),
      "Not enough content",
    );
  });
});
