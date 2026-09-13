import { notFound } from "next/navigation";
import { getCompanyDetails } from "@/actions/company.actions";
import CompanyDetails from "@/components/admin/CompanyDetails";

async function CompanyDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getCompanyDetails(id);

  // null (missing or not yours) and a failed read both land here
  if (!details?.id) notFound();

  return (
    <div className="col-span-3">
      <CompanyDetails details={details} />
    </div>
  );
}

export default CompanyDetailsPage;
