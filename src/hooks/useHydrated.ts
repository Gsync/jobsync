import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

// False on the server and during hydration, true after; lets a render read
// client-only values (localStorage, navigator) without a mismatch.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
