import { getResumeById } from "@/actions/profile.actions";
import ResumeContainer from "@/components/profile/ResumeContainer";
import { getMockResumeById } from "@/lib/mock.utils";

async function ResumePage({ params }: any) {
  const { id } = params;
  // const resume = await getResumeById(id);
  const resume = await getMockResumeById(id);
  return (
    <div className="col-span-3">
      <ResumeContainer resume={resume} />
    </div>
  );
}

export default ResumePage;
