"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from "react";

import { cn } from "@/lib/utils";

import { MoreVertical, Pencil, Link, Archive, Trash } from "lucide-react";

type IconComponent = ComponentType<
  Readonly<{ size?: number; className?: string }>
>;

export type KebabMenuItem = Readonly<{
  id: string;
  label?: string;
  icon?: IconComponent;
  danger?: boolean;
  separator?: boolean;
}>;

export type KebabActionsDropdownProps = Readonly<
  {
    rowTitle?: string;
    triggerAriaLabel?: string;
    menuAriaLabel?: string;
    items?: readonly KebabMenuItem[];
    onItemClick?: (item: KebabMenuItem) => void;
  } & ComponentPropsWithoutRef<"div">
>;

const defaultItems: readonly KebabMenuItem[] = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "copy-link", label: "Copy link", icon: Link },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "separator-delete", separator: true },
  { id: "delete", label: "Delete", icon: Trash, danger: true },
];

type KebabMenuItemRowProps = Readonly<{
  item: KebabMenuItem;
  onSelect: (item: KebabMenuItem) => void;
}>;

function KebabMenuItemRow({ item, onSelect }: KebabMenuItemRowProps) {
  if (item.separator) {
    return <hr className="border-0 border-t border-neutral-100" />;
  }

  const Icon = item.icon;

  return (
    <button
      type="button"
      role="menuitem"
      aria-label={item.label}
      onClick={() => onSelect(item)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors",
        item.danger
          ? "text-red-500 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      {Icon ? (
        <Icon
          size={12}
          className={item.danger ? "text-red-400" : "text-neutral-400"}
        />
      ) : null}
      {item.label}
    </button>
  );
}

// Inline expand row — menu opens inside the same card, widths always match.
export const KebabActionsDropdown = forwardRef<
  HTMLDivElement,
  KebabActionsDropdownProps
>(
  (
    {
      rowTitle = "Quarterly report",
      triggerAriaLabel = "More actions",
      menuAriaLabel = "Actions menu",
      items = defaultItems,
      onItemClick,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

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

    const handleItemSelect = (item: KebabMenuItem) => {
      setOpen(false);
      onItemClick?.(item);
    };

    const toggleOpen = () => setOpen((prev) => !prev);

    return (
      <div
        ref={ref}
        data-slot="kebab-actions-dropdown"
        className={cn("relative inline-block font-sans", className)}
        {...props}
      >
        <div
          ref={rootRef}
          className={cn(
            "w-56 overflow-hidden rounded-xl border border-neutral-100 bg-white",
            open && "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]",
          )}
        >
          <div className="flex items-center gap-2 py-2 pr-2 pl-3">
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-neutral-700">
              {rowTitle}
            </span>

            <button
              type="button"
              aria-label={triggerAriaLabel}
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
                "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors",
                open
                  ? "bg-neutral-100 text-neutral-700"
                  : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600",
              )}
            >
              <MoreVertical size={15} strokeWidth={2} />
            </button>
          </div>

          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label={menuAriaLabel}
              className="border-t border-neutral-100 py-1"
            >
              {items.map((item) => (
                <KebabMenuItemRow
                  key={item.id}
                  item={item}
                  onSelect={handleItemSelect}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

KebabActionsDropdown.displayName = "KebabActionsDropdown";
