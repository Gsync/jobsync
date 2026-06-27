"use client";

import { useEffect, useRef } from "react";

// Auto-scrolls a sheet to the bottom while streaming, stops if user scrolls up.
export function useSheetAutoScroll(isLoading: boolean, content: unknown) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const handleSheetScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) {
      userScrolledUpRef.current = true;
    }
  };

  const resetScroll = () => {
    userScrolledUpRef.current = false;
  };

  useEffect(() => {
    if (isLoading && content && !userScrolledUpRef.current) {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [content, isLoading]);

  return { scrollAnchorRef, handleSheetScroll, resetScroll };
}
