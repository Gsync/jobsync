import { toast } from "sonner";
import type { ActionResult } from "@/models/action.model";

export function toastSuccess(message: string, title?: string) {
  if (title) toast.success(title, { description: message });
  else toast.success(message);
}

export function toastError(message?: string, title?: string) {
  const text = message ?? "Something went wrong. Please try again.";
  if (title) toast.error(title, { description: text });
  else toast.error(text);
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
