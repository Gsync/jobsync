import { getJobDetails } from "@/actions/job.actions";
import JobDetails from "@/components/myjobs/JobDetails";

async function JobDetailsPage({ params }: any) {
  const { id } = params;
  const { job } = await getJobDetails(id);

  return (
    <div className="col-span-3">
      <JobDetails job={job} />
    </div>
  );
}

export default JobDetailsPage;
