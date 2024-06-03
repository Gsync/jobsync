import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddJobForm from "./AddJobForm";
import { getCompanyList, getStatusList } from "@/actions/job.actions";

export async function AddJob() {
  const [statuses, companies] = await Promise.all([
    getStatusList(),
    getCompanyList(),
  ]);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Job</DialogTitle>
      </DialogHeader>
      <AddJobForm jobStatuses={statuses} companies={companies} />
    </>
  );
}
