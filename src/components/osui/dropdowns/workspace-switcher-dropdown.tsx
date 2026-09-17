"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  cloneElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";

import { cn } from "@/lib/utils";

import { ChevronsUpDown, Plus, GraduationCap, Briefcase } from "lucide-react";

export type WorkspaceItem = Readonly<{
  id: string;
  name?: string;
  icon?: ReactElement;
  plan?: string;
  active?: boolean;
  separator?: boolean;
}>;

export type WorkspaceSwitcherDropdownProps = Readonly<
  {
    triggerAriaLabel?: string;
    menuAriaLabel?: string;
    createLabel?: string;
    workspaces?: readonly WorkspaceItem[];
    onWorkspaceChange?: (workspace: WorkspaceItem) => void;
    onCreateWorkspace?: () => void;
  } & ComponentPropsWithoutRef<"div">
>;

// MIT opensourceui.in — brand icons swapped for lucide (same component otherwise).
const defaultWorkspaces: readonly WorkspaceItem[] = [
  {
    id: "school",
    name: "School",
    icon: <GraduationCap />,
    plan: "PhD",
    active: true,
  },
  {
    id: "job",
    name: "Jobs",
    icon: <Briefcase />,
    plan: "Search",
  },
  { id: "separator-create", separator: true },
  { id: "create", name: "Create workspace" },
];

type WorkspaceRowProps = Readonly<{
  item: WorkspaceItem;
  onSelect: (item: WorkspaceItem) => void;
  createLabel: string;
}>;

function WorkspaceRow({ item, onSelect, createLabel }: WorkspaceRowProps) {
  if (item.separator) {
    return <hr className="border-0 border-t border-neutral-100" />;
  }

  const isCreate = item.id === "create";

  return (
    <button
      type="button"
      role="menuitem"
      aria-label={isCreate ? createLabel : item.name}
      aria-current={item.active ? "true" : undefined}
      onClick={() => onSelect(item)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium transition-colors",
        item.active
          ? "bg-neutral-50 text-neutral-900"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center text-neutral-500">
        {isCreate ? (
          <Plus size={14} strokeWidth={2} />
        ) : item.icon ? (
          cloneElement(item.icon as ReactElement<{ size?: number }>, {
            size: 14,
          })
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {isCreate ? createLabel : item.name}
      </span>
      {!isCreate && item.plan ? (
        <span className="shrink-0 text-[10px] text-neutral-400">
          {item.plan}
        </span>
      ) : null}
    </button>
  );
}

// Org switcher — rectangular bar trigger, inline expand menu (same width).
export const WorkspaceSwitcherDropdown = forwardRef<
  HTMLDivElement,
  WorkspaceSwitcherDropdownProps
>(
  (
    {
      triggerAriaLabel = "Switch workspace",
      menuAriaLabel = "Workspace list",
      createLabel = "Create workspace",
      workspaces = defaultWorkspaces,
      onWorkspaceChange,
      onCreateWorkspace,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const activeWorkspace =
      workspaces.find((w) => w.active && !w.separator) ??
      workspaces.find((w) => !w.separator && w.id !== "create");

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

    const handleWorkspaceSelect = (item: WorkspaceItem) => {
      setOpen(false);
      if (item.id === "create") {
        onCreateWorkspace?.();
      } else {
        onWorkspaceChange?.(item);
      }
    };

    const toggleOpen = () => setOpen((prev) => !prev);

    return (
      <div
        ref={ref}
        data-slot="workspace-switcher-dropdown"
        className={cn("relative inline-block font-sans", className)}
        {...props}
      >
        <div
          ref={rootRef}
          className={cn(
            "w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white",
            open && "shadow-[0_12px_32px_-12px_rgba(0,0,0,0.1)]",
          )}
        >
          <button
            type="button"
            aria-label={`${triggerAriaLabel}: ${activeWorkspace?.name ?? "Workspace"}`}
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
            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50">
              {activeWorkspace?.icon ? (
                cloneElement(
                  activeWorkspace.icon as ReactElement<{ size?: number }>,
                  { size: 15 },
                )
              ) : (
                <span className="text-[10px] font-semibold text-neutral-500">
                  {activeWorkspace?.name?.charAt(0) ?? "W"}
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-neutral-800">
                {activeWorkspace?.name ?? "Workspace"}
              </span>
              {activeWorkspace?.plan ? (
                <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
                  {activeWorkspace.plan} plan
                </span>
              ) : null}
            </span>

            <ChevronsUpDown size={14} className="shrink-0 text-neutral-400" />
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label={menuAriaLabel}
              className="border-t border-neutral-100 py-1"
            >
              {workspaces.map((item) => (
                <WorkspaceRow
                  key={item.id}
                  item={item}
                  createLabel={createLabel}
                  onSelect={handleWorkspaceSelect}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

WorkspaceSwitcherDropdown.displayName = "WorkspaceSwitcherDropdown";
