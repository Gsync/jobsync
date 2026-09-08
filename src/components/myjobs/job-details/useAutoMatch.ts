import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Armed by the Match button on the jobs list. The flag is dropped on the first
// run so the router.refresh() the chat fires after saving the match — or any
// other re-render — cannot start a second one.
export function useAutoMatch(onMatch: () => void) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const armed = searchParams.get("match") === "1";
  const firedRef = useRef(false);

  useEffect(() => {
    if (!armed || firedRef.current) return;
    firedRef.current = true;
    router.replace("?tab=match", { scroll: false });
    onMatch();
  }, [armed, onMatch, router]);
}
