import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddJobForm from "./AddJobForm";
import {
  getCompanyList,
  getJobLocationList,
  getJobSourceList,
  getJobTitleList,
  getStatusList,
} from "@/actions/job.actions";

export async function AddJob() {
  const [statuses, companies, titles, locations, sources] = await Promise.all([
    getStatusList(),
    getCompanyList(),
    getJobTitleList(),
    getJobLocationList(),
    getJobSourceList(),
  ]);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Job</DialogTitle>
      </DialogHeader>
      <AddJobForm
        jobStatuses={statuses}
        companies={companies}
        jobTitles={titles}
        locations={locations}
        jobSources={sources}
      />
    </>
  );
}
