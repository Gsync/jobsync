"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddContact from "@/components/AddContact";
import ContactsTable from "@/components/admin/ContactsTable";
import { JobTabEmptyState } from "@/components/myjobs/job-details/JobTabEmptyState";
import { getContactById } from "@/actions/contact.actions";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getAllContactRoles } from "@/actions/contactRole.actions";
import type { Contact, ContactRole } from "@/models/contact.model";
import type { Company, JobLocation } from "@/models/job.model";

type CompanyContactsTabProps = {
  companyId: string;
  currentContacts: Contact[];
  formerContacts: Contact[];
};

export function CompanyContactsTab({
  companyId,
  currentContacts,
  formerContacts,
}: CompanyContactsTabProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [pickersLoading, setPickersLoading] = useState(false);
  const pickersRequested = useRef(false);

  const reload = () => router.refresh();

  // Most visits never open the dialog, so its three option lists wait for it
  const openDialog = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open || pickersRequested.current) return;
    pickersRequested.current = true;
    setPickersLoading(true);
    Promise.all([getAllCompanies(), getAllJobLocations(), getAllContactRoles()])
      .then(([companyList, locationList, roleList]) => {
        if (Array.isArray(companyList)) setCompanies(companyList);
        if (Array.isArray(locationList)) setLocations(locationList);
        if (Array.isArray(roleList)) setRoles(roleList);
      })
      .finally(() => setPickersLoading(false));
  }, []);

  const onAdd = () => {
    setEditContact(null);
    openDialog(true);
  };

  const onEdit = async (contactId: string) => {
    const contact = await getContactById(contactId);
    setEditContact(contact);
    openDialog(true);
  };

  const hasAny = currentContacts.length > 0 || formerContacts.length > 0;

  return (
    <div className="space-y-6">
      {hasAny && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-7 gap-1" onClick={onAdd}>
            <PlusCircle className="h-3.5 w-3.5" />
            Add Contact
          </Button>
        </div>
      )}

      {currentContacts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Works here</h3>
          <ContactsTable
            contacts={currentContacts}
            reloadContacts={reload}
            editContact={onEdit}
            hideCompanyColumn
          />
        </section>
      )}

      {formerContacts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Worked with you here
          </h3>
          <ContactsTable
            contacts={formerContacts}
            reloadContacts={reload}
            editContact={onEdit}
          />
        </section>
      )}

      {!hasAny && (
        <JobTabEmptyState
          icon={Users}
          title="No contacts at this company yet"
          description="Add the recruiters, hiring managers and colleagues you know here."
          actionLabel="Add Contact"
          onAction={onAdd}
        />
      )}

      <AddContact
        hideTrigger
        prefillCompanyId={companyId}
        editContact={editContact}
        resetEditContact={() => setEditContact(null)}
        reloadContacts={reload}
        dialogOpen={dialogOpen}
        setDialogOpen={openDialog}
        pickersLoading={pickersLoading}
        companies={companies}
        locations={locations}
        roles={roles}
      />
    </div>
  );
}
