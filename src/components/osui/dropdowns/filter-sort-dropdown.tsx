"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";

import { ChevronDown } from "lucide-react";

export type FilterSortOption = Readonly<{
  id: string;
  label: string;
}>;

export type FilterSortDropdownProps = Readonly<
  {
    label?: string;
    triggerAriaLabel?: string;
    menuAriaLabel?: string;
    value?: string;
    options?: readonly FilterSortOption[];
    onValueChange?: (option: FilterSortOption) => void;
  } & ComponentPropsWithoutRef<"div">
>;

const defaultOptions: readonly FilterSortOption[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "popular", label: "Most popular" },
  { id: "az", label: "A → Z" },
  { id: "za", label: "Z → A" },
];

type FilterSortOptionRowProps = Readonly<{
  option: FilterSortOption;
  selected: boolean;
  onSelect: (option: FilterSortOption) => void;
}>;

function FilterSortOptionRow({
  option,
  selected,
  onSelect,
}: FilterSortOptionRowProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      aria-label={option.label}
      onClick={() => onSelect(option)}
      className={cn(
        "flex w-full cursor-pointer items-center border-l-2 px-3 py-2 text-left text-[12px] font-medium transition-colors",
        selected
          ? "border-neutral-800 bg-neutral-50 text-neutral-900"
          : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50",
      )}
    >
      {option.label}
    </button>
  );
}

// Native select style — menu width matches trigger exactly.
export const FilterSortDropdown = forwardRef<
  HTMLDivElement,
  FilterSortDropdownProps
>(
  (
    {
      label = "Sort",
      triggerAriaLabel = "Sort options",
      menuAriaLabel = "Sort menu",
      value = "newest",
      options = defaultOptions,
      onValueChange,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const selectedOption =
      options.find((option) => option.id === value) ?? options[0];

    useEffect(() => {
      const closeOnOutside = (event: globalThis.MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };

      document.addEventListener("mousedown", closeOnOutside);
      document.addEventListener("keydown", closeOnEscape);
      return () => {
        document.removeEventListener("mousedown", closeOnOutside);
        document.removeEventListener("keydown", closeOnEscape);
      };
    }, []);

    const handleOptionSelect = (option: FilterSortOption) => {
      setOpen(false);
      onValueChange?.(option);
    };

    const toggleOpen = () => setOpen((prev) => !prev);

    return (
      <div
        ref={ref}
        data-slot="filter-sort-dropdown"
        className={cn("relative inline-block w-52 font-sans", className)}
        {...props}
      >
        <div ref={rootRef} className="relative">
          <button
            type="button"
            aria-label={`${triggerAriaLabel}: ${selectedOption?.label ?? value}`}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={open ? menuId : undefined}
            onClick={toggleOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleOpen();
              }
            }}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
              open
                ? "border-neutral-300"
                : "border-neutral-200 hover:border-neutral-300",
            )}
          >
            <span className="min-w-0">
              <span className="block text-[10px] text-neutral-400">
                {label}
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-medium text-neutral-800">
                {selectedOption?.label}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-neutral-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label={menuAriaLabel}
              className="absolute top-[calc(100%+4px)] right-0 left-0 z-100 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)]"
            >
              {options.map((option) => (
                <FilterSortOptionRow
                  key={option.id}
                  option={option}
                  selected={option.id === value}
                  onSelect={handleOptionSelect}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

FilterSortDropdown.displayName = "FilterSortDropdown";
