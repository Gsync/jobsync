"use client";
import { Fragment, useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REQUIRED_FIELD_LABELS, RequiredField } from "./addJobHints";

type AddJobFooterProps = {
  missing: RequiredField[];
  onJump: (field: RequiredField) => void;
  onCancel: () => void;
  isPending: boolean;
  saveDisabled: boolean;
};

export function AddJobFooter({
  missing,
  onJump,
  onCancel,
  isPending,
  saveDisabled,
}: AddJobFooterProps) {
  const [shortcut, setShortcut] = useState("Ctrl↵");
  // Read after mount so server and client render the same text
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setShortcut("⌘↵");
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-8 py-3.5">
      {missing.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {missing.length} required left:{" "}
          {missing.map((f, i) => (
            <Fragment key={f}>
              {i > 0 && ", "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => onJump(f)}
              >
                {REQUIRED_FIELD_LABELS[f]}
              </button>
            </Fragment>
          ))}
        </p>
      )}
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          data-testid="save-job-btn"
          disabled={saveDisabled}
        >
          Save
          <kbd
            aria-hidden="true"
            className="rounded border border-primary-foreground/30 px-1 text-xs font-normal"
          >
            {shortcut}
          </kbd>
          {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />}
        </Button>
      </div>
    </div>
  );
}
