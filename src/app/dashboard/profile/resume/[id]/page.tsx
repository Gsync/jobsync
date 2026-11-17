import {
  getDefaultResumeId,
  getResumeById,
} from "@/actions/profile.actions";
import ResumeContainer from "@/components/profile/ResumeContainer";
import { notFound } from "next/navigation";

async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: resume }, defaultResumeId] = await Promise.all([
    getResumeById(id),
    getDefaultResumeId(),
  ]);

  // A link to a deleted resume would otherwise crash ResumeContainer
  if (!resume) notFound();

  return (
    <div className="col-span-3">
      <ResumeContainer resume={resume} defaultResumeId={defaultResumeId} />
    </div>
  );
}

export default ResumePage;
