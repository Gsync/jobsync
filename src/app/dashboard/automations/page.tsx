import { getResumeList } from "@/actions/profile.actions";
import { AutomationContainer } from "@/components/automations/AutomationContainer";

export default async function AutomationsPage() {
  const resumeResult = await getResumeList(1, 100);
  const resumes =
    resumeResult?.data?.map((r: { id: string; title: string }) => ({
      id: r.id,
      title: r.title,
    })) || [];

  return (
    <div className="col-span-3 py-6">
      <AutomationContainer resumes={resumes} />
    </div>
  );
}
