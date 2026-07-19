import { toast } from "@/components/ui/use-toast";
import { toastSuccess, toastError, toastActionResult } from "@/lib/toast";

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toastSuccess", () => {
  it("toasts a success variant with the given description", () => {
    toastSuccess("Job has been created successfully");
    expect(toast).toHaveBeenCalledWith({
      variant: "success",
      title: undefined,
      description: "Job has been created successfully",
    });
  });

  it("accepts an optional title", () => {
    toastSuccess("Saved", "Nice");
    expect(toast).toHaveBeenCalledWith({
      variant: "success",
      title: "Nice",
      description: "Saved",
    });
  });
});

describe("toastError", () => {
  it("defaults the title to 'Error'", () => {
    toastError("Failed to save job");
    expect(toast).toHaveBeenCalledWith({
      variant: "destructive",
      title: "Error",
      description: "Failed to save job",
    });
  });

  it("falls back to a generic message when no description is given", () => {
    toastError();
    expect(toast).toHaveBeenCalledWith({
      variant: "destructive",
      title: "Error",
      description: "Something went wrong. Please try again.",
    });
  });

  it("allows overriding the title", () => {
    toastError("Nope", "Custom Title");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Custom Title" }),
    );
  });
});

describe("toastActionResult", () => {
  it("toasts success and calls onSuccess with the result data on success", () => {
    const onSuccess = vi.fn();
    toastActionResult(
      { success: true, data: { id: "1" } },
      { success: "Job has been created successfully", onSuccess },
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        description: "Job has been created successfully",
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith({ id: "1" });
  });

  it("does not call onSuccess on failure and toasts result.message", () => {
    const onSuccess = vi.fn();
    toastActionResult(
      { success: false, message: "Failed to save job" },
      { success: "Job has been created successfully", onSuccess },
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Error",
        description: "Failed to save job",
      }),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("toasts the fallback error when result is undefined", () => {
    toastActionResult(undefined, {
      success: "Job has been created successfully",
      error: "Could not create job",
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Error",
        description: "Could not create job",
      }),
    );
  });

  it("falls back to the generic message when result is undefined and no error override is given", () => {
    toastActionResult(undefined, { success: "Job has been created successfully" });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Something went wrong. Please try again.",
      }),
    );
  });
});
