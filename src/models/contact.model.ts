// Shape returned by getContactList / getContactById, not the raw Prisma row:
// the relation objects are narrowed to what the table and expanded row show.

export interface ContactRole {
  id: string;
  label: string;
  value: string;
  createdBy: string;
  _count?: { jobContacts: number };
}

export interface EntityRef {
  id: string;
  label: string;
}

// What the job-details tab and the expanded Library row need off the person —
// deliberately not the full Contact, which the link queries do not select.
export interface ContactSummary {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  Company: EntityRef | null;
}

export interface JobContactLink {
  id: string;
  jobId: string;
  contactId: string;
  roleId: string;
  createdAt: Date;
  Role: ContactRole;
  Job?: {
    id: string;
    JobTitle: { label: string };
    Company: { label: string };
  };
  Contact?: ContactSummary;
}

export interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  companyId: string | null;
  Company: EntityRef | null;
  locationId: string | null;
  Location: EntityRef | null;
  relationship: string | null;
  workedAtCompanyId: string | null;
  WorkedAtCompany: EntityRef | null;
  workedFrom: Date | null;
  workedTo: Date | null;
  notes: string | null;
  lastContactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  jobLinks?: JobContactLink[];
  _count?: { jobLinks: number };
}

// What the job-tab ComboBox consumes: id/label/value, like every other picker.
export interface ContactRef {
  id: string;
  label: string;
  value: string;
}
