"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";

export type ProgressStage = {
  label: string;
  value: number;
  color?: string;
};

export type ProgressRingCardProps = Readonly<
  {
    title?: string;
    progress?: number;
    progressLabel?: string;
    showPercentage?: boolean;
    ringStartColor?: string;
    ringEndColor?: string;
    stages?: ProgressStage[];
    animateOnMount?: boolean;
    onStageClick?: (stage: ProgressStage, index: number) => void;
  } & ComponentPropsWithoutRef<"div">
>;

const RADIUS = 40;
const STROKE_WIDTH = 6;

// Production-ready Progress Ring component — styled with Tailwind CSS.
export const ProgressRingCard = forwardRef<
  HTMLDivElement,
  ProgressRingCardProps
>(
  (
    {
      className,
      title = "Project Progress",
      progress = 73,
      progressLabel = "Complete",
      showPercentage = true,
      ringStartColor = "#14b8a6",
      ringEndColor = "#06b6d4",
      stages = [
        { label: "Design", value: 100, color: "bg-emerald-500" },
        { label: "Development", value: 73, color: "bg-teal-500" },
        { label: "Testing", value: 30, color: "bg-neutral-200" },
      ],
      animateOnMount = true,
      onStageClick,
      ...props
    },
    ref,
  ) => {
    const gradientId = useId();
    const [displayProgress, setDisplayProgress] = useState(
      animateOnMount ? 0 : progress,
    );
    const [activeStage, setActiveStage] = useState<number | null>(null);

    const normalizedProgress = useMemo(
      () => Math.min(100, Math.max(0, progress)),
      [progress],
    );

    const normalizedStages = useMemo(
      () =>
        stages.map((stage) => ({
          ...stage,
          value: Math.min(100, Math.max(0, stage.value)),
        })),
      [stages],
    );

    const circumference = useMemo(() => 2 * Math.PI * RADIUS, []);

    const offset = useMemo(
      () => circumference - (displayProgress / 100) * circumference,
      [circumference, displayProgress],
    );

    useEffect(() => {
      if (!animateOnMount) {
        setDisplayProgress(normalizedProgress);
        return;
      }

      const start = performance.now();
      const duration = 900;

      const frame = (time: number) => {
        const t = Math.min(1, (time - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        setDisplayProgress(Math.round(normalizedProgress * eased));
        if (t < 1) requestAnimationFrame(frame);
      };

      const raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }, [animateOnMount, normalizedProgress]);

    const handleStageClick = (stage: ProgressStage, index: number) => {
      setActiveStage(index);
      setDisplayProgress(stage.value);
      onStageClick?.(stage, index);
    };

    return (
      <div
        ref={ref}
        data-slot="progress-ring-card"
        className={cn(
          "w-64 rounded-2xl border border-neutral-100 bg-white p-5 font-sans shadow-lg",
          className,
        )}
        {...props}
      >
        <p
          data-slot="progress-ring-card-title"
          className="mb-4 font-mono text-[10px] tracking-widest text-neutral-400 uppercase"
        >
          {title}
        </p>

        <div
          data-slot="progress-ring-card-ring"
          className="relative mx-auto mb-4 h-28 w-28"
        >
          <svg
            role="img"
            aria-label={`${displayProgress}% ${progressLabel}`}
            viewBox="0 0 100 100"
            className="h-full w-full -rotate-90"
          >
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="#f5f5f5"
              strokeWidth={STROKE_WIDTH}
            />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={ringStartColor} />
                <stop offset="100%" stopColor={ringEndColor} />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {showPercentage && (
              <span className="text-2xl font-light text-neutral-900">
                {displayProgress}%
              </span>
            )}
            <span className="font-mono text-[9px] text-neutral-400">
              {progressLabel}
            </span>
          </div>
        </div>

        <div data-slot="progress-ring-card-breakdown" className="space-y-2">
          {normalizedStages.map((stage, index) => (
            <button
              key={stage.label}
              type="button"
              onClick={() => handleStageClick(stage, index)}
              data-slot="progress-ring-card-stage"
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-neutral-50",
                activeStage === index && "bg-teal-50",
              )}
            >
              <span className="w-16 text-[10px] text-neutral-500">
                {stage.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    stage.color ?? "bg-teal-500",
                  )}
                  style={{ width: `${stage.value}%` }}
                />
              </div>
              <span className="w-6 text-right font-mono text-[10px] text-neutral-400">
                {stage.value}%
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  },
);

ProgressRingCard.displayName = "ProgressRingCard";
