"use client";
import CompaniesContainer from "@/components/CompaniesContainer";
import JobLocationsContainer from "@/components/JobLocationsContainer";
import JobTitlesContainer from "@/components/JobTitlesContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

function AdminTabsContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const queryParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(queryParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [queryParams]
  );

  const onTabChange = (tab: string) => {
    router.push(pathname + "?" + createQueryString("tab", tab));
    router.push(pathname + "?" + createQueryString("page", "1"));
  };
  return (
    <Tabs
      defaultValue={queryParams.get("tab") || "companies"}
      onValueChange={(e) => onTabChange(e)}
    >
      <TabsList>
        <TabsTrigger value="companies">Companies</TabsTrigger>
        <TabsTrigger value="titles">Job Titles</TabsTrigger>
        <TabsTrigger value="locations">Locations</TabsTrigger>
      </TabsList>
      <TabsContent value="companies">
        <CompaniesContainer createQueryString={createQueryString} />
      </TabsContent>
      <TabsContent value="titles">
        <JobTitlesContainer />
      </TabsContent>
      <TabsContent value="locations">
        <JobLocationsContainer />
      </TabsContent>
    </Tabs>
  );
}

export default AdminTabsContainer;
