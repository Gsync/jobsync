import { getJobDetails } from "@/actions/job.actions";
import JobDetails from "@/components/myjobs/JobDetails";

async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { job } = await getJobDetails(id);

  return (
    <div className="col-span-3">
      <JobDetails job={job} />
    </div>
  );
}

export default JobDetailsPage;
