import { useState, useEffect, useRef, useCallback } from "react";
import { getFromLocalStorage, saveToLocalStorage } from "@/utils/localstorage.utils";
import { APP_CONSTANTS } from "@/lib/constants";

const {
  RESIZABLE_PANEL_DEFAULT_WIDTH: DEFAULT_WIDTH,
  RESIZABLE_PANEL_MIN_WIDTH: MIN_WIDTH,
  RESIZABLE_PANEL_MAX_WIDTH_RATIO: MAX_WIDTH_RATIO,
} = APP_CONSTANTS;

export function useResizablePanel(storageKey: string) {
  const [width, setWidth] = useState<number>(() =>
    getFromLocalStorage(storageKey, DEFAULT_WIDTH)
  );
  const isDragging = useRef(false);
  // Mirrored into state so consumers can suppress width transitions mid-drag.
  const [dragging, setDragging] = useState(false);
  // Manual dragging always takes control back from the expand toggle.
  const [isExpanded, setIsExpanded] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    setDragging(true);
    setIsExpanded(false);
    startX.current = e.clientX;
    startWidth.current = widthRef.current;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  }, []);

  const toggleExpand = useCallback(() => {
    let next: number;
    if (isExpanded) {
      next = DEFAULT_WIDTH;
    } else {
      const sidebarWidth =
        document.getElementById(APP_CONSTANTS.SIDEBAR_DOM_ID)?.offsetWidth ?? 0;
      next = window.innerWidth - sidebarWidth;
    }
    widthRef.current = next;
    setWidth(next);
    setIsExpanded(!isExpanded);
    saveToLocalStorage(storageKey, next);
  }, [isExpanded, storageKey]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(Math.max(startWidth.current + delta, MIN_WIDTH), maxWidth);
      widthRef.current = newWidth;
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      saveToLocalStorage(storageKey, widthRef.current);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [storageKey]);

  return { width, handleMouseDown, isDragging: dragging, isExpanded, toggleExpand };
}
