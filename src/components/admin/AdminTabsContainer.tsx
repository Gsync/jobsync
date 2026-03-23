"use client";
import CompaniesContainer from "@/components/admin/CompaniesContainer";
import JobLocationsContainer from "@/components/admin/JobLocationsContainer";
import JobSourcesContainer from "@/components/admin/JobSourcesContainer";
import JobTitlesContainer from "@/components/admin/JobTitlesContainer";
import TagsContainer from "@/components/admin/TagsContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/i18n";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

function AdminTabsContainer() {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const queryParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(queryParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [queryParams],
  );

  const onTabChange = (tab: string) => {
    router.push(pathname + "?" + createQueryString("tab", tab));
  };
  return (
    <Tabs
      defaultValue={queryParams.get("tab") || "companies"}
      onValueChange={(e) => onTabChange(e)}
    >
      <TabsList>
        <TabsTrigger value="companies">{t("admin.companies")}</TabsTrigger>
        <TabsTrigger value="job-titles">{t("admin.jobTitles")}</TabsTrigger>
        <TabsTrigger value="locations">{t("admin.locations")}</TabsTrigger>
        <TabsTrigger value="sources">{t("admin.sources")}</TabsTrigger>
        <TabsTrigger value="skills">{t("admin.skills")}</TabsTrigger>
      </TabsList>
      <TabsContent value="companies">
        <CompaniesContainer />
      </TabsContent>
      <TabsContent value="job-titles">
        <JobTitlesContainer />
      </TabsContent>
      <TabsContent value="locations">
        <JobLocationsContainer />
      </TabsContent>
      <TabsContent value="sources">
        <JobSourcesContainer />
      </TabsContent>
      <TabsContent value="skills">
        <TagsContainer />
      </TabsContent>
    </Tabs>
  );
}

export default AdminTabsContainer;
