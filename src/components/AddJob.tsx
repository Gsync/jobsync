import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddJobForm from "./AddJobForm";
import { getStatusList } from "@/actions/job.actions";

export async function AddJob() {
  const statuses = await getStatusList();
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Job</DialogTitle>
      </DialogHeader>
      <AddJobForm jobStatuses={statuses} />
    </>
  );
}
