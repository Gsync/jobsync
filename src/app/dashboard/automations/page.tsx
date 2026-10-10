import { getResumeList } from "@/actions/profile.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { AutomationContainer } from "@/components/automations/AutomationContainer";

export default async function AutomationsPage() {
  const resumeResult = await getResumeList(1, APP_CONSTANTS.RESUME_PICKER_LIMIT);
  const resumes =
    resumeResult?.data?.map(
      (r: { id: string; title: string; _count?: { ResumeSections?: number } }) => ({
        id: r.id,
        title: r.title,
        sectionCount: r._count?.ResumeSections ?? 0,
      }),
    ) || [];

  return (
    <div className="col-span-3">
      <AutomationContainer resumes={resumes} />
    </div>
  );
}
