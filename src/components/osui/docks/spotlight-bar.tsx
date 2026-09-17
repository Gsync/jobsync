"use client";

import {
  forwardRef,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Command, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type SpotlightSuggestion = Readonly<{
  id: string;
  label: string;
  hint?: string;
}>;

export type SpotlightBarProps = Readonly<
  {
    placeholder?: string;
    suggestions?: readonly SpotlightSuggestion[];
    showShortcut?: boolean;
    onSubmit?: (value: string) => void;
    onSelectSuggestion?: (id: string) => void;
  } & Omit<ComponentPropsWithoutRef<"form">, "onSubmit">
>;

const DEFAULT_SUGGESTIONS: readonly SpotlightSuggestion[] = [
  { id: "new-page", label: "Create page", hint: "P" },
  { id: "invite", label: "Invite teammate", hint: "I" },
  { id: "analytics", label: "Open analytics", hint: "A" },
];

// Spotlight bar — frosted command search bar aligned with MacDock shell.
export const SpotlightBar = forwardRef<HTMLFormElement, SpotlightBarProps>(
  (
    {
      className,
      placeholder = "Search actions, pages, people…",
      suggestions = DEFAULT_SUGGESTIONS,
      showShortcut = true,
      onSubmit,
      onSelectSuggestion,
      ...props
    },
    ref,
  ) => {
    const inputId = useId();
    const [value, setValue] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const filtered = suggestions.filter((item) =>
      item.label.toLowerCase().includes(value.trim().toLowerCase()),
    );

    const run = (event?: FormEvent) => {
      event?.preventDefault();
      const target = filtered[activeIndex];
      if (target) {
        onSelectSuggestion?.(target.id);
        setValue("");
        setOpen(false);
        return;
      }
      if (value.trim()) {
        onSubmit?.(value.trim());
        setValue("");
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        setOpen(true);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) =>
          filtered.length === 0 ? 0 : (index + 1) % filtered.length,
        );
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          filtered.length === 0
            ? 0
            : (index - 1 + filtered.length) % filtered.length,
        );
      }
      if (event.key === "Escape") setOpen(false);
    };

    return (
      <form
        ref={ref}
        data-slot="spotlight-bar"
        onSubmit={run}
        className={cn("relative w-sm font-sans", className)}
        {...props}
      >
        <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-50 bg-white/50 p-3 shadow-xl shadow-black/10 backdrop-blur-md">
          <label htmlFor={inputId} className="sr-only">
            Spotlight search
          </label>
          <Search
            size={16}
            aria-hidden
            className="ml-1 shrink-0 text-neutral-400"
          />
          <input
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 ring-0 outline-none placeholder:text-neutral-400 focus:border-transparent focus:ring-0"
          />
          {showShortcut ? (
            <kbd className="hidden items-center gap-0.5 rounded-md border border-neutral-100 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 md:inline-flex">
              <Command size={10} aria-hidden />K
            </kbd>
          ) : null}
        </div>

        <ul
          role="listbox"
          className={cn(
            "ease-smooth absolute top-[calc(100%+0.5rem)] left-0 z-10 w-full origin-top overflow-hidden rounded-2xl border border-neutral-50 bg-white/90 p-2 shadow-xl shadow-black/10 backdrop-blur-md transition-[opacity,transform] duration-200",
            open && filtered.length > 0
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0",
          )}
        >
          {filtered.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onSelectSuggestion?.(item.id);
                  setValue("");
                  setOpen(false);
                }}
                className={cn(
                  "ease-smooth flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150",
                  index === activeIndex
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-50",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Sparkles
                    size={14}
                    aria-hidden
                    className="shrink-0 text-neutral-400"
                  />
                  <span className="truncate text-sm font-medium">
                    {item.label}
                  </span>
                </span>
                {item.hint ? (
                  <kbd className="rounded-md border border-neutral-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                    {item.hint}
                  </kbd>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </form>
    );
  },
);

SpotlightBar.displayName = "SpotlightBar";
