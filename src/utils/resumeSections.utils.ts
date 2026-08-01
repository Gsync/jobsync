import { toastError } from "@/lib/toast";
import {
  buildInsufficientSectionsMessage,
  hasMinResumeSections,
} from "@/lib/resumeSections";

export { hasMinResumeSections };

export const warnInsufficientResumeSections = (
  action: string,
  hint?: string,
): void => {
  toastError(buildInsufficientSectionsMessage(action, hint), "Not enough content");
};
