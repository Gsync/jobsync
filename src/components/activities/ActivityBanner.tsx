import {
  AlertCircle,
  CheckCircle2,
  CircleStop,
  Clock,
  Monitor,
  XCircle,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import React from "react";

type BannerVariant = "success" | "warning" | "error" | "info";

interface BannerProps {
  title: string;
  typeLabel?: string;
  startTime: Date;
  variant?: BannerVariant;
  onStopActivity: (autoStop: boolean) => void;
  elapsedTime: number;
  className?: string;
}

const variantStyles: Record<BannerVariant, string> = {
  success:
    "border-green-200 bg-green-50 text-green-600 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400",
  warning:
    "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-400",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-400",
};

const variantIcons: Record<BannerVariant, React.ReactElement> = {
  success: <CheckCircle2 className="size-5" />,
  warning: <AlertCircle className="size-5" />,
  error: <XCircle className="size-5" />,
  info: <AlertCircle className="size-5" />,
};

const focusRing: Record<BannerVariant, string> = {
  success: "focus-visible:ring-green-500",
  warning: "focus-visible:ring-yellow-500",
  error: "focus-visible:ring-red-500",
  info: "focus-visible:ring-blue-500",
};

export function ActivityBanner({
  title,
  typeLabel,
  startTime,
  variant = "success",
  onStopActivity,
  elapsedTime,
  className,
}: BannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-2 text-sm font-medium",
        variantStyles[variant],
        className
      )}
    >
      <span className="shrink-0 opacity-80">{variantIcons[variant]}</span>
      <span className="flex-1 min-w-0 truncate">{title}</span>

      <span className="hidden shrink-0 items-center gap-1.5 tabular-nums sm:flex">
        <Clock className="size-4 opacity-80" />
        Started {formatDistanceToNowStrict(startTime, { addSuffix: true })}
      </span>
      {typeLabel && (
        <span className="hidden shrink-0 items-center gap-1.5 lg:flex">
          <Monitor className="size-4 opacity-80" />
          {typeLabel}
        </span>
      )}

      <button
        title="Stop Activity"
        aria-label="Stop Activity"
        type="button"
        className={cn(
          "shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md p-1.5 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 lg:px-2.5 lg:py-1",
          focusRing[variant]
        )}
        onClick={() => onStopActivity(false)}
      >
        <CircleStop className="size-5 text-red-500 dark:text-red-400" />
        <span className="hidden lg:inline">Stop Activity</span>
      </button>
    </div>
  );
}
