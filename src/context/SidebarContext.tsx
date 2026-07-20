"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { APP_CONSTANTS } from "@/lib/constants";

type SidebarContextValue = {
  expanded: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

// One year, so the preference persists like a typical "remember my setting" cookie.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function SidebarProvider({
  children,
  initialExpanded,
}: {
  children: React.ReactNode;
  initialExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    document.cookie = `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=${expanded}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  }, [expanded]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "b" || (!e.metaKey && !e.ctrlKey)) return;

      // Let editable elements (inputs, Tiptap/ProseMirror) keep Cmd/Ctrl+B
      // for their own shortcuts (e.g. bold) instead of toggling the sidebar.
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;

      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <SidebarContext.Provider value={{ expanded, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
