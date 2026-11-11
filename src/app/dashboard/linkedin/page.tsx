import { getLinkedInSearches } from "@/actions/linkedin.actions";
import { LinkedInSearchesContainer } from "@/components/linkedin/LinkedInSearchesContainer";
import type { LinkedInSearch } from "@/models/linkedin.model";

export default async function LinkedInPage() {
  const result = await getLinkedInSearches();
  const searches: LinkedInSearch[] =
    result?.success && Array.isArray(result.data) ? result.data : [];

  return (
    <div className="col-span-3">
      <LinkedInSearchesContainer initialSearches={searches} />
    </div>
  );
}
