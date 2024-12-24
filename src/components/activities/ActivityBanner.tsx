// components/Banner.tsx
import { AlertCircle, CheckCircle2, CircleStop, XCircle } from "lucide-react";
import { cn, formatElapsedTime } from "@/lib/utils";

type BannerVariant = "success" | "warning" | "error" | "info";

interface BannerProps {
  message: string;
  variant?: BannerVariant;
  onStopActivity: (autoStop: boolean) => void;
  elapsedTime: number;
  className?: string;
}

const variantStyles: Record<BannerVariant, string> = {
  success: "bg-green-400 text-black border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

const variantIcons: Record<BannerVariant, JSX.Element> = {
  success: <CheckCircle2 className=" text-green-800" />,
  warning: <AlertCircle className="h-5 w-5 text-yellow-400" />,
  error: <XCircle className="h-5 w-5 text-red-400" />,
  info: <AlertCircle className="h-5 w-5 text-blue-400" />,
};

export function ActivityBanner({
  message,
  variant = "success",
  onStopActivity,
  elapsedTime,
  className,
}: BannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border rounded-lg mb-4",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex-shrink-0">{variantIcons[variant]}</div>
      <div className="flex-1 font-medium">{message}</div>
      <span>{formatElapsedTime(elapsedTime)}</span>
      {
        <button
          title="Stop Activity"
          type="button"
          className={cn(
            "flex-shrink-0 rounded-lg p-1.5 inline-flex items-center justify-center hover:bg-opacity-10 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2",
            {
              "focus:ring-green-500": variant === "success",
              "focus:ring-yellow-500": variant === "warning",
              "focus:ring-red-500": variant === "error",
              "focus:ring-blue-500": variant === "info",
            }
          )}
          onClick={() => onStopActivity(false)}
        >
          <span className="sr-only">Stop Activity</span>
          <CircleStop className="text-red-500" />
        </button>
      }
    </div>
  );
}
