import {
  getJobDetails,
  getJobSourceList,
  getStatusList,
} from "@/actions/job.actions";
import JobDetails from "@/components/myjobs/JobDetails";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getAllTags } from "@/actions/tag.actions";
import { getAllJobStageTypes } from "@/actions/jobStageType.actions";
import { notFound } from "next/navigation";

async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [
    { job },
    statuses,
    companies,
    titles,
    locations,
    sources,
    tags,
    stageTypes,
  ] = await Promise.all([
    getJobDetails(id),
    getStatusList(),
    getAllCompanies(),
    getAllJobTitles(),
    getAllJobLocations(),
    getJobSourceList(),
    getAllTags(),
    getAllJobStageTypes(),
  ]);

  // A link to a job that was deleted (or never belonged to this user) would
  // otherwise crash JobDetails on the first job.* read.
  if (!job) notFound();

  return (
    <div className="col-span-3">
      <JobDetails
        job={job}
        jobStatuses={statuses}
        companies={companies}
        titles={titles}
        locations={locations}
        sources={sources}
        tags={tags ?? []}
        stageTypes={stageTypes ?? []}
      />
    </div>
  );
}

export default JobDetailsPage;
