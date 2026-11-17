"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// There is one right rail. Opening any panel closes whichever holds it, so
// two panels never collide over stacking, scrim and pointer-events. It was
// written to keep the chat panel apart from the three modal AI sheets; those
// are retired and the chat panel is the only holder today, so the invariant
// costs nothing and the next rail-holding panel inherits it.
type RightRail = {
  holder: string | null;
  requestOpen: (id: string, onEvict?: () => void) => void;
  close: (id: string) => void;
};

const RightRailContext = createContext<RightRail | null>(null);

export function RightRailProvider({ children }: { children: React.ReactNode }) {
  const [holder, setHolder] = useState<string | null>(null);
  // Who holds the rail and how to tell them they lost it. Read only in the
  // callbacks below, so eviction happens in the claim, not in an effect.
  const claimRef = useRef<{ id: string; onEvict?: () => void } | null>(null);

  // Unconditional: no busy state, no refusal, no veto. The collisions this
  // exists for are collisions of presence.
  const requestOpen = useCallback((id: string, onEvict?: () => void) => {
    const previous = claimRef.current;
    claimRef.current = { id, onEvict };
    setHolder(id);
    if (previous && previous.id !== id) previous.onEvict?.();
  }, []);

  const close = useCallback((id: string) => {
    if (claimRef.current?.id === id) claimRef.current = null;
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
