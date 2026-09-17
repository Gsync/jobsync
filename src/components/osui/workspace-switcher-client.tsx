"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Briefcase } from "lucide-react";
import {
  WorkspaceSwitcherDropdown,
  type WorkspaceItem,
} from "./dropdowns/workspace-switcher-dropdown";
import { setActiveWorkspaceId } from "@/lib/workspaces/active";

export type OsuiWorkspace = {
  id: string;
  name: string;
  type: "SCHOOL" | "JOB";
};

const ICONS = {
  SCHOOL: <GraduationCap />,
  JOB: <Briefcase />,
} as const;

// Real opensourceui.in WorkspaceSwitcherDropdown, wired to server state.
export function WorkspaceSwitcherClient({
  workspaces,
  activeId,
  counts,
}: {
  workspaces: OsuiWorkspace[];
  activeId: string | null;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (workspaces.length === 0) return null;
  const items: WorkspaceItem[] = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    icon: ICONS[w.type],
    plan: `${counts[w.id] ?? 0} applications`,
    active: w.id === activeId,
  }));
  return (
    <div className={busy ? "pointer-events-none opacity-60" : undefined}>
      <WorkspaceSwitcherDropdown
        workspaces={items}
        onWorkspaceChange={async (w) => {
          setBusy(true);
          try {
            await setActiveWorkspaceId(w.id);
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
