import { getJobDetails } from "@/actions/job.actions";
import JobDetails from "@/components/myjobs/JobDetails";
import { JobResponse } from "@/models/job.model";

async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: job } = await getJobDetails(id);

  return (
    <div className="col-span-3">
      <JobDetails job={job as JobResponse} />
    </div>
  );
}

export default JobDetailsPage;
