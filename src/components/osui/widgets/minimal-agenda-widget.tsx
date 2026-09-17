"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Minimal daily agenda — tap rows to toggle done state with strikethrough animation.
export type AgendaItem = Readonly<{
  time: string;
  title: string;
  done: boolean;
}>;

const DEFAULT_ITEMS: AgendaItem[] = [
  { time: "09:00", title: "Design review", done: true },
  { time: "11:30", title: "Client sync", done: false },
  { time: "14:00", title: "Ship components", done: false },
];

type AgendaTitleProps = Readonly<{
  done: boolean;
  children: string;
}>;

// Strikethrough hugs text width only — fixed line-height keeps every slash aligned.
function AgendaTitle({ done, children }: AgendaTitleProps) {
  return (
    <span className="min-w-0 flex-1">
      <span className="relative inline-block max-w-full">
        <span
          className={cn(
            "block max-w-full truncate text-xs leading-4 font-medium transition-colors duration-300 ease-out",
            done ? "text-neutral-400" : "text-neutral-900",
          )}
        >
          {children}
        </span>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-2 left-0 h-px bg-neutral-400/80",
            "transition-[width] duration-500 ease-in-out",
            done ? "w-full" : "w-0",
          )}
        />
      </span>
    </span>
  );
}

export type MinimalAgendaWidgetProps = Readonly<
  {
    // Adaptation: optional live items (defaults to the demo set).
    items?: AgendaItem[];
  } & ComponentPropsWithoutRef<"div">
>;

export const MinimalAgendaWidget = forwardRef<
  HTMLDivElement,
  MinimalAgendaWidgetProps
>(({ className, items: itemsProp, ...props }, ref) => {
  const [items, setItems] = useState<AgendaItem[]>(itemsProp ?? DEFAULT_ITEMS);

  const toggleItem = (title: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.title === title ? { ...item, done: !item.done } : item,
      ),
    );
  };

  return (
    <div
      ref={ref}
      data-slot="minimal-agenda-widget"
      className={cn(
        "w-64 rounded-3xl border border-neutral-100 bg-white p-4 font-sans shadow-lg shadow-black/5",
        className,
      )}
      {...props}
    >
      <p className="mb-3 text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">
        Today
      </p>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.title}>
            <button
              type="button"
              aria-pressed={item.done}
              aria-label={`${item.title} at ${item.time}`}
              onClick={() => toggleItem(item.title)}
              className="flex w-full cursor-pointer items-center gap-3 px-1 py-0.5 text-left"
            >
              <span
                className={cn(
                  "w-10 shrink-0 text-[11px] font-medium tabular-nums transition-colors duration-300 ease-out",
                  item.done ? "text-neutral-300" : "text-neutral-400",
                )}
              >
                {item.time}
              </span>

              <AgendaTitle done={item.done}>{item.title}</AgendaTitle>

              <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                <Check
                  size={12}
                  aria-hidden
                  className={cn(
                    "text-emerald-500 transition-opacity duration-300 ease-out",
                    item.done ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

MinimalAgendaWidget.displayName = "MinimalAgendaWidget";
