"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type JobTabEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionTitle?: string;
  actionTestId?: string;
};

export function JobTabEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled,
  actionTitle,
  actionTestId,
}: JobTabEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="max-w-[40ch] text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          className="mt-1 cursor-pointer"
          onClick={onAction}
          disabled={actionDisabled}
          title={actionTitle}
          data-testid={actionTestId}
        >
          <Icon className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
