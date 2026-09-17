"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceSwitcher, type OsuiWorkspace } from "./workspace-switcher";
import { setActiveWorkspaceId } from "@/lib/workspaces/active";

export function WorkspaceSwitcherClient({
  workspaces,
  activeId,
}: {
  workspaces: OsuiWorkspace[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (workspaces.length === 0) return null;
  return (
    <div className={busy ? "pointer-events-none opacity-60" : undefined}>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeId={activeId}
        onSelect={async (id) => {
          setBusy(true);
          try {
            await setActiveWorkspaceId(id);
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
