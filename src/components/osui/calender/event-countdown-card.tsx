"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";

function getCountdown(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, done: diff <= 0 };
}

export type EventCountdownCardProps = Readonly<
  {
    title?: string;
    targetDate?: string;
    onComplete?: () => void;
  } & ComponentPropsWithoutRef<"div">
>;

// Event countdown — live days, hours, and minutes until a target date.
export const EventCountdownCard = forwardRef<
  HTMLDivElement,
  EventCountdownCardProps
>(
  (
    {
      className,
      title = "Product launch",
      targetDate = "2026-12-01T09:00:00",
      onComplete,
      ...props
    },
    ref,
  ) => {
    const target = useMemo(() => new Date(targetDate), [targetDate]);
    const [countdown, setCountdown] = useState(() => getCountdown(target));

    useEffect(() => {
      const tick = () => {
        const next = getCountdown(target);
        setCountdown(next);
        if (next.done) onComplete?.();
      };
      tick();
      const timer = globalThis.setInterval(tick, 60_000);
      return () => globalThis.clearInterval(timer);
    }, [target, onComplete]);

    const dateLabel = target.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <div
        ref={ref}
        data-slot="event-countdown-card"
        className={cn(
          "w-56 rounded-2xl border border-neutral-100 bg-white p-5 font-sans shadow-lg shadow-black/5 select-none",
          className,
        )}
        {...props}
      >
        <p className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
          Countdown
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{dateLabel}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4">
          {[
            { value: countdown.days, label: "days" },
            { value: countdown.hours, label: "hrs" },
            { value: countdown.minutes, label: "min" },
          ].map((unit) => (
            <div key={unit.label} className="text-center">
              <p
                key={`${unit.label}-${unit.value}`}
                className="text-2xl leading-none font-light text-neutral-900 tabular-nums opacity-100 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] starting:translate-y-1 starting:opacity-0"
              >
                {String(unit.value).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] text-neutral-400 uppercase">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

EventCountdownCard.displayName = "EventCountdownCard";
