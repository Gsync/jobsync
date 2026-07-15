import { DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader } from "lucide-react";

type FormDialogFooterProps = {
  onCancel: () => void;
  isPending: boolean;
  saveDisabled: boolean;
};

// Shared Cancel/Save footer for form dialogs laid out as a 2-col grid form
export function FormDialogFooter({
  onCancel,
  isPending,
  saveDisabled,
}: FormDialogFooterProps) {
  return (
    <div className="md:col-span-2 mt-4">
      <DialogFooter>
        <div>
          <Button
            type="reset"
            variant="outline"
            className="mt-2 md:mt-0 w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
        <Button type="submit" disabled={saveDisabled}>
          Save
          {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />}
        </Button>
      </DialogFooter>
    </div>
  );
}
