import { toast } from "@/components/ui/use-toast";
import {
  buildInsufficientSectionsMessage,
  hasMinResumeSections,
} from "@/lib/resumeSections";

export { hasMinResumeSections };

export const warnInsufficientResumeSections = (
  action: string,
  hint?: string,
): void => {
  toast({
    variant: "destructive",
    title: "Not enough content",
    description: buildInsufficientSectionsMessage(action, hint),
  });
};
