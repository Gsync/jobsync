import { toast } from "@/components/ui/use-toast";
import type { ActionResult } from "@/models/action.model";

export function toastSuccess(description: string, title?: string) {
  toast({ variant: "success", title, description });
}

export function toastError(description?: string, title = "Error") {
  toast({
    variant: "destructive",
    title,
    description: description ?? "Something went wrong. Please try again.",
  });
}

// Collapses the repeated success/error branch into one call.
export function toastActionResult<T>(
  result: ActionResult<T> | undefined,
  opts: { success: string; onSuccess?: (data: T | undefined) => void; error?: string },
) {
  if (result?.success) {
    toastSuccess(opts.success);
    opts.onSuccess?.(result.data);
  } else {
    toastError(result?.message ?? opts.error);
  }
}
