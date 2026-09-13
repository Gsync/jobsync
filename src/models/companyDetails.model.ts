import type { Contact } from "./contact.model";
import type { Company } from "./job.model";

// What getCompanyDetails returns: the job rows are narrowed to the Jobs tab's
// columns, and matchData is already folded into matchScore server-side.
export interface CompanyJobRow {
  id: string;
  createdAt: Date;
  applied: boolean;
  appliedDate: Date | null;
  matchScore: number | null;
  JobTitle: { label: string };
  Status: { label: string; value: string };
  Location: { label: string } | null;
  JobSource: { label: string } | null;
}

export interface CompanyDetails extends Company {
  jobs: CompanyJobRow[];
  appliedCount: number;
  dismissedJobsCount: number;
  currentContacts: Contact[];
  formerContacts: Contact[];
}
