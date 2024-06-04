import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddJobForm from "./AddJobForm";
import {
  getCompanyList,
  getJobLocationList,
  getJobTitleList,
  getStatusList,
} from "@/actions/job.actions";

export async function AddJob() {
  const [statuses, companies, jobTitles, locations] = await Promise.all([
    getStatusList(),
    getCompanyList(),
    getJobTitleList(),
    getJobLocationList(),
  ]);
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
      />
    </>
  );
}
