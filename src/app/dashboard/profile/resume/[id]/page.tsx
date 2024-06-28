import { getResumeById } from "@/actions/profile.actions";
import ResumeContainer from "@/components/profile/ResumeContainer";

async function ResumePage({ params }: any) {
  const { id } = params;
  const resume = await getResumeById(id);
  return (
    <div className="col-span-3">
      <ResumeContainer resume={resume} />
    </div>
  );
}

export default ResumePage;
