"use client";
import { useRef, useState } from "react";
import { PlusCircle, Trash, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";
import { toastActionResult } from "@/lib/toast";
import {
  getAllContacts,
  getJobContacts,
  removeJobContact,
} from "@/actions/contact.actions";
import { getAllContactRoles } from "@/actions/contactRole.actions";
import type {
  ContactRef,
  ContactRole,
  JobContactLink,
} from "@/models/contact.model";
import type { Company, JobLocation } from "@/models/job.model";
import { JobTabEmptyState } from "./JobTabEmptyState";
import { AddJobContactForm } from "./AddJobContactForm";

type JobContactsTabProps = {
  jobId: string;
  links: JobContactLink[];
  companies?: Company[];
  locations?: JobLocation[];
};

export function JobContactsTab({
  jobId,
  links,
  companies = [],
  locations = [],
}: JobContactsTabProps) {
  const [rows, setRows] = useState<JobContactLink[]>(links);
  const [showForm, setShowForm] = useState(false);
  const [contacts, setContacts] = useState<ContactRef[]>([]);
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [removeTarget, setRemoveTarget] = useState<JobContactLink | null>(null);
  const loadedRef = useRef(false);

  // The job page already runs seven parallel queries and most visits never
  // leave Description, so the pickers wait for the first open of the form.
  const openForm = async () => {
    setShowForm(true);
    if (loadedRef.current) return;
    loadedRef.current = true;
    const [contactList, roleList] = await Promise.all([
      getAllContacts(),
      getAllContactRoles(),
    ]);
    if (Array.isArray(contactList)) setContacts(contactList);
    if (Array.isArray(roleList)) setRoles(roleList);
  };

  const reload = async () => {
    const fresh = await getJobContacts(jobId);
    if (Array.isArray(fresh)) setRows(fresh);
  };

  const onRemove = async () => {
    if (!removeTarget) return;
    const res = await removeJobContact(removeTarget.id);
    setRemoveTarget(null);
    toastActionResult(res, {
      success: "Contact has been unlinked from this job",
      onSuccess: reload,
    });
  };

  return (
    <div className="space-y-4">
      {rows.length > 0 && !showForm && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={openForm}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add Contact
          </Button>
        </div>
      )}

      {showForm && (
        <AddJobContactForm
          jobId={jobId}
          contacts={contacts}
          roles={roles}
          companies={companies}
          locations={locations}
          onCancel={() => setShowForm(false)}
          onLinked={() => {
            setShowForm(false);
            reload();
          }}
          onContactCreated={(contact) => setContacts([contact, ...contacts])}
        />
      )}

      {rows.length === 0 && !showForm && (
        <JobTabEmptyState
          icon={Users}
          title="No contacts on this job"
          description="Link the recruiter, the panel, or a reference you named for this application."
          actionLabel="Add Contact"
          onAction={openForm}
        />
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border p-3 text-sm"
            >
              <span className="font-medium">{row.Contact?.name}</span>
              {row.Contact?.title && (
                <span className="text-muted-foreground">
                  {row.Contact.title}
                </span>
              )}
              {row.Contact?.Company && (
                <span className="text-muted-foreground">
                  {row.Contact.Company.label}
                </span>
              )}
              <Badge variant="secondary">{row.Role.label}</Badge>
              {row.Contact?.email && (
                <a
                  href={`mailto:${row.Contact.email}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {row.Contact.email}
                </a>
              )}
              {row.Contact?.phone && (
                <a
                  href={`tel:${row.Contact.phone}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {row.Contact.phone}
                </a>
              )}
              {row.Contact?.linkedinUrl && (
                <a
                  href={row.Contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  LinkedIn
                </a>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto cursor-pointer"
                aria-label={`Remove ${row.Contact?.name}`}
                onClick={() => setRemoveTarget(row)}
              >
                <Trash className="h-4 w-4 text-red-600" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DeleteAlertDialog
        pageTitle="contact link"
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        onDelete={onRemove}
        alertDescription="Removing this only unlinks the contact from this job. The contact itself is kept."
      />
    </div>
  );
}
