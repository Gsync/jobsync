import { Metadata } from "next";

import { getJobSourceList, getStatusList } from "@/actions/job.actions";
import JobsContainer from "@/components/myjobs/JobsContainer";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";

export const metadata: Metadata = {
  title: "My Jobs | JobSync",
};

async function MyJobs() {
  const [statuses, companies, titles, locations, sources] = await Promise.all([
    getStatusList(),
    getAllCompanies(),
    getAllJobTitles(),
    getAllJobLocations(),
    getJobSourceList(),
  ]);
  return (
    <div className="col-span-3">
      <JobsContainer
        companies={companies}
        titles={titles}
        locations={locations}
        sources={sources}
        statuses={statuses}
      />
    </div>
  );
}

export default MyJobs;
