"use client";

// osui: workspace-switcher (paper/ink, light-first).
// Props-driven and dependency-free apart from React + Tailwind.

export type OsuiWorkspace = {
  id: string;
  name: string;
  type: "SCHOOL" | "JOB";
};

export function WorkspaceSwitcher({
  workspaces,
  activeId,
  onSelect,
}: {
  workspaces: OsuiWorkspace[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1"
    >
      {workspaces.map((w) => {
        const active = w.id === activeId;
        return (
          <button
            key={w.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(w.id)}
            className={
              active
                ? "rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            }
          >
            {w.type === "SCHOOL" ? "🎓 " : "💼 "}
            {w.name}
          </button>
        );
      })}
    </div>
  );
}
