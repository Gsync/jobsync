import { useRouter, useSearchParams } from "next/navigation";

export function useTabQueryParam(
  validTabs: readonly string[],
  defaultTab: string,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const activeTab = raw && validTabs.includes(raw) ? raw : defaultTab;

  const setTab = (tab: string) => {
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  return [activeTab, setTab] as const;
}
