import { Metadata } from "next";

import { getJobSourceList, getStatusList } from "@/actions/job.actions";
import JobsContainer from "@/components/myjobs/JobsContainer";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getAllTags } from "@/actions/tag.actions";

export const metadata: Metadata = {
  title: "My Jobs | JobSync",
};

async function MyJobs() {
  const [statuses, companies, titles, locations, sourcesResult, tags] =
    await Promise.all([
      getStatusList(),
      getAllCompanies(),
      getAllJobTitles(),
      getAllJobLocations(),
      getJobSourceList(),
      getAllTags(),
    ]);
  const sources = sourcesResult?.data as any;
  return (
    <div className="col-span-3">
      <JobsContainer
        companies={companies}
        titles={titles}
        locations={locations}
        sources={sources}
        statuses={statuses}
        tags={tags ?? []}
      />
    </div>
  );
}

export default MyJobs;
