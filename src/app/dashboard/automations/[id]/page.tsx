import { AutomationDetailContainer } from "@/components/automations/AutomationDetailContainer";

async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="col-span-3">
      <AutomationDetailContainer automationId={id} />
    </div>
  );
}

export default AutomationDetailPage;
