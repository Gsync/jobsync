"use client";
import { useEffect, useState } from "react";
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

  const list = useContactsList(searchTerm, roleId);

  // The tab is a client component with no server parent to pass these down,
  // and the Library's other tabs should not pay for this one's pickers.
  useEffect(() => {
    Promise.all([
      getAllCompanies(),
      getAllJobLocations(),
      getAllContactRoles(),
    ]).then(([companyList, locationList, roleList]) => {
      if (Array.isArray(companyList)) setCompanies(companyList);
      if (Array.isArray(locationList)) setLocations(locationList);
      if (Array.isArray(roleList)) setRoles(roleList);
    });
  }, []);

  const onEditContact = async (contactId: string) => {
    const contact = await getContactById(contactId);
    setEditContact(contact);
    setDialogOpen(true);
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
            <ContactRoleFilter roleId={roleId} onRoleChange={setRoleId} />
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
              setDialogOpen={setDialogOpen}
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
