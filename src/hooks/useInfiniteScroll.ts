import { useCallback, useEffect, useRef } from "react";
import { APP_CONSTANTS } from "@/lib/constants";

export function useInfiniteScroll(
  hasMore: boolean,
  isLoading: boolean,
  onLoadMore: () => void
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const stateRef = useRef({ hasMore, isLoading, onLoadMore });

  useEffect(() => {
    stateRef.current = { hasMore, isLoading, onLoadMore };
  }, [hasMore, isLoading, onLoadMore]);

  return useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const { hasMore, isLoading, onLoadMore } = stateRef.current;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: APP_CONSTANTS.INTERSECTION_OBSERVER_THRESHOLD }
    );
    observerRef.current.observe(node);
  }, []);
}
