"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// There is one right rail. Opening any panel closes whichever holds it, so
// the stacking, scrim and pointer-events collisions between the chat panel
// and the three modal AI sheets never arise.
type RightRail = {
  holder: string | null;
  requestOpen: (id: string) => void;
  close: (id: string) => void;
};

const RightRailContext = createContext<RightRail | null>(null);

export function RightRailProvider({ children }: { children: React.ReactNode }) {
  const [holder, setHolder] = useState<string | null>(null);

  // Unconditional in v1: no busy state, no refusal, no veto. All three
  // collisions this exists for are collisions of presence.
  const requestOpen = useCallback((id: string) => setHolder(id), []);

  const close = useCallback((id: string) => {
    setHolder((current) => (current === id ? null : current));
  }, []);

  const value = useMemo(
    () => ({ holder, requestOpen, close }),
    [holder, requestOpen, close],
  );

  return (
    <RightRailContext.Provider value={value}>
      {children}
    </RightRailContext.Provider>
  );
}

export function useRightRail(): RightRail {
  const ctx = useContext(RightRailContext);
  if (!ctx) {
    throw new Error("useRightRail must be used within a RightRailProvider");
  }
  return ctx;
}

// Convenience for a panel that only cares about its own turn on the rail.
export function useRightRailPanel(id: string) {
  const { holder, requestOpen, close } = useRightRail();
  return {
    isHolder: holder === id,
    claim: useCallback(() => requestOpen(id), [requestOpen, id]),
    release: useCallback(() => close(id), [close, id]),
  };
}
