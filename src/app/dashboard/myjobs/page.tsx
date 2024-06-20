import { Metadata } from "next";

import { getJobSourceList, getStatusList } from "@/actions/job.actions";
import JobsContainer from "@/components/JobsContainer";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getMockList } from "@/lib/mock.utils";

export const metadata: Metadata = {
  title: "My Jobs | JobSync",
};

async function MyJobs() {
  const [statuses, companies, titles, locations, sources] = await Promise.all([
    getStatusList(),
    // getAllCompanies(),
    // getAllJobTitles(),
    // getAllJobLocations(),
    getMockList(1, 10, "companies"),
    getMockList(1, 10, "jobTitles"),
    getMockList(1, 10, "locations"),
    getJobSourceList(),
  ]);
  return (
    <div className="col-span-3">
      <JobsContainer
        companies={companies.data}
        titles={titles.data}
        locations={locations.data}
        sources={sources}
        statuses={statuses}
      />
    </div>
  );
}

export default MyJobs;
