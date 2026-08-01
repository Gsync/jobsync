import { toast } from "sonner";
import { toastSuccess, toastError, toastActionResult } from "@/lib/toast";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toastSuccess", () => {
  it("calls toast.success with just the message when no title is given", () => {
    toastSuccess("Job has been created successfully");
    expect(toast.success).toHaveBeenCalledWith("Job has been created successfully");
  });

  it("promotes the title to the message and the message to the description", () => {
    toastSuccess("Saved to Downloads.", "PDF exported");
    expect(toast.success).toHaveBeenCalledWith("PDF exported", {
      description: "Saved to Downloads.",
    });
  });
});

describe("toastError", () => {
  it("calls toast.error with just the message when no title is given", () => {
    toastError("Failed to save job");
    expect(toast.error).toHaveBeenCalledWith("Failed to save job");
  });

  it("does not pass an options object when there is no title", () => {
    toastError("Failed to save job");
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0]).toHaveLength(1);
  });

  it("promotes the title to the message and the message to the description", () => {
    toastError("Remove it from resumes first.", "Skill is in use!");
    expect(toast.error).toHaveBeenCalledWith("Skill is in use!", {
      description: "Remove it from resumes first.",
    });
  });

  it("falls back to a generic message when no message is given", () => {
    toastError();
    expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });
});

describe("toastActionResult", () => {
  it("toasts success and calls onSuccess with the result data on success", () => {
    const onSuccess = vi.fn();
    toastActionResult(
      { success: true, data: { id: "1" } },
      { success: "Job has been created successfully", onSuccess },
    );

    expect(toast.success).toHaveBeenCalledWith("Job has been created successfully");
    expect(onSuccess).toHaveBeenCalledWith({ id: "1" });
  });

  it("does not call onSuccess on failure and toasts result.message", () => {
    const onSuccess = vi.fn();
    toastActionResult(
      { success: false, message: "Failed to save job" },
      { success: "Job has been created successfully", onSuccess },
    );

    expect(toast.error).toHaveBeenCalledWith("Failed to save job");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("toasts the error override when result is undefined", () => {
    toastActionResult(undefined, {
      success: "Job has been created successfully",
      error: "Could not create job",
    });

    expect(toast.error).toHaveBeenCalledWith("Could not create job");
  });

  it("falls back to the generic message when result is undefined and no error override is given", () => {
    toastActionResult(undefined, { success: "Job has been created successfully" });

    expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });
});
