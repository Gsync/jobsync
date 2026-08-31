import { useLayoutEffect, useRef, useState } from "react";

// Content-box width of the observed element. The first read happens in a
// layout effect rather than waiting on the observer, so a width-dependent
// layout never paints the wrong variant first.
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.getBoundingClientRect().width);

    // Deliberately undebounced: callers size a chart from this, and a
    // delayed width lands after the layout transition it belongs to,
    // arriving as a jump rather than as part of the movement.
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
