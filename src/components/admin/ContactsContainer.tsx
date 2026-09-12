"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import Loading from "../Loading";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";
import AddContact from "../AddContact";
import ContactsTable from "./ContactsTable";
import { ContactRoleFilter } from "./contacts-container/ContactRoleFilter";
import { useContactsList } from "./contacts-container/useContactsList";
import { getContactById } from "@/actions/contact.actions";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getAllContactRoles } from "@/actions/contactRole.actions";
import type { Contact, ContactRole } from "@/models/contact.model";
import type { Company, JobLocation } from "@/models/job.model";

function ContactsContainer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [pickersLoading, setPickersLoading] = useState(false);
  const pickersRequested = useRef(false);

  const list = useContactsList(searchTerm, roleId);

  // Roles feed the role filter beside the search box, so the tab needs them
  useEffect(() => {
    getAllContactRoles().then((res) => Array.isArray(res) && setRoles(res));
  }, []);

  // Company and location options are only ever seen inside the dialog, so
  // switching to this tab should not pay for them
  const openDialog = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open || pickersRequested.current) return;
    pickersRequested.current = true;
    setPickersLoading(true);
    Promise.all([getAllCompanies(), getAllJobLocations()])
      .then(([companyList, locationList]) => {
        if (Array.isArray(companyList)) setCompanies(companyList);
        if (Array.isArray(locationList)) setLocations(locationList);
      })
      .finally(() => setPickersLoading(false));
  }, []);

  const onEditContact = async (contactId: string) => {
    const contact = await getContactById(contactId);
    setEditContact(contact);
    openDialog(true);
  };

  return (
    <div className="col-span-3">
      <Card x-chunk="dashboard-06-chunk-0">
        <ResponsiveCardHeader>
          <div className="flex items-baseline gap-2">
            <CardTitle>Contacts</CardTitle>
            {!list.initialLoading && list.total > 0 && (
              <RecordsCount
                count={list.contacts.length}
                total={list.total}
                label="contacts"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <ContactRoleFilter
              roles={roles}
              roleId={roleId}
              onRoleChange={setRoleId}
            />
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search contacts..."
            />
            <AddContact
              editContact={editContact}
              reloadContacts={list.reload}
              resetEditContact={() => setEditContact(null)}
              dialogOpen={dialogOpen}
              setDialogOpen={openDialog}
              pickersLoading={pickersLoading}
              companies={companies}
              locations={locations}
              roles={roles}
            />
          </div>
        </ResponsiveCardHeader>
        <CardContent>
          {list.initialLoading && <Loading />}
          {list.contacts.length > 0 && (
            <ContactsTable
              contacts={list.contacts}
              reloadContacts={list.reload}
              editContact={onEditContact}
            />
          )}
          {list.hasMore && (
            <div ref={list.sentinelRef} className="flex justify-center p-4">
              {list.loadingMore && (
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ContactsContainer;
