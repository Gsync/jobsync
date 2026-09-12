"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import ContactRow from "./ContactRow";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { deleteContactById } from "@/actions/contact.actions";
import { toastSuccess, toastError } from "@/lib/toast";
import { AlertDialog } from "@/models/alertDialog.model";
import type { Contact } from "@/models/contact.model";

type ContactsTableProps = {
  contacts: Contact[];
  reloadContacts: () => void;
  editContact: (id: string) => void;
};

function ContactsTable({
  contacts,
  reloadContacts,
  editContact,
}: ContactsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  // A link is meaningless without the person and JobContact cascades from
  // contactId, so the dialog warns about the links rather than blocking.
  const onDeleteContact = (contact: Contact) => {
    const jobs = contact._count?.jobLinks ?? 0;
    setAlert({
      openState: true,
      deleteAction: true,
      itemId: contact.id,
      title: jobs > 0 ? "Delete this contact?" : undefined,
      description:
        jobs > 0
          ? `${contact.name} is linked to ${jobs} job${jobs === 1 ? "" : "s"}. Deleting the contact removes those links. This cannot be undone.`
          : undefined,
    });
  };

  const deleteContact = async (contactId: string | undefined) => {
    if (contactId) {
      const { success, message } = await deleteContactById(contactId);
      if (success) {
        toastSuccess("Contact has been deleted successfully");
        reloadContacts();
      } else {
        toastError(message);
      }
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <span className="sr-only">Expand</span>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Last contacted</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact: Contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              expanded={expandedId === contact.id}
              onToggle={() =>
                setExpandedId((prev) =>
                  prev === contact.id ? null : contact.id,
                )
              }
              onEdit={() => editContact(contact.id)}
              onDelete={() => onDeleteContact(contact)}
            />
          ))}
        </TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="contact"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteContact(alert.itemId)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default ContactsTable;
