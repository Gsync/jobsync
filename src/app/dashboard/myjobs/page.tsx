import { Metadata } from "next";

import {
  getJobLocationList,
  getJobSourceList,
  getJobTitleList,
  getStatusList,
} from "@/actions/job.actions";
import JobsContainer from "@/components/JobsContainer";
import { getCompanyList } from "@/actions/company.actions";

export const metadata: Metadata = {
  title: "My Jobs | JobSync",
};

async function MyJobs() {
  const [statuses, companies, titles, locations, sources] = await Promise.all([
    getStatusList(),
    getCompanyList(),
    getJobTitleList(),
    getJobLocationList(),
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
