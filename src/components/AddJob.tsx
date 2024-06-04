import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddJobForm from "./AddJobForm";
import {
  getCompanyList,
  getJobLocationList,
  getJobSourceList,
  getJobTitleList,
  getJobsList,
  getStatusList,
} from "@/actions/job.actions";

export async function AddJob() {
  const [statuses, companies, jobTitles, locations, jobSources, jobs] =
    await Promise.all([
      getStatusList(),
      getCompanyList(),
      getJobTitleList(),
      getJobLocationList(),
      getJobSourceList(),
      getJobsList(),
    ]);
  console.log("JOBS LIST: ", jobs);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Job</DialogTitle>
      </DialogHeader>
      <AddJobForm
        jobStatuses={statuses}
        companies={companies}
        jobTitles={jobTitles}
        locations={locations}
        jobSources={jobSources}
      />
    </>
  );
}
