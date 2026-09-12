"use client";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Combobox } from "./ComboBox";
import { DatePicker } from "./DatePicker";
import { FormDialogFooter } from "./FormDialogFooter";
import { toastActionResult } from "@/lib/toast";
import { createContact, updateContact } from "@/actions/contact.actions";
import {
  AddContactFormSchema,
  type ContactFormValues,
} from "@/models/addContactForm.schema";
import type { Contact, ContactRef, ContactRole } from "@/models/contact.model";
import type { Company, JobLocation } from "@/models/job.model";

type AddContactProps = {
  reloadContacts: () => void;
  editContact?: Contact | null;
  resetEditContact: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  companies: Company[];
  locations: JobLocation[];
  roles: ContactRole[];
  prefillName?: string;
  hideTrigger?: boolean;
  onSaved?: (contact: ContactRef) => void;
};

const REFERENCE_ROLE_VALUE = "reference";

const EMPTY_CONTACT: ContactFormValues = {
  name: "",
  title: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  company: "",
  location: "",
  relationship: "",
  workedAtCompany: "",
  contactRole: "",
  workedFrom: null,
  workedTo: null,
  notes: "",
  lastContactedAt: null,
};

// A labelled rule between field groups; spans both columns of the form grid
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:col-span-2 flex items-center gap-3 pt-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function AddContact({
  reloadContacts,
  editContact,
  resetEditContact,
  dialogOpen,
  setDialogOpen,
  companies,
  locations,
  roles,
  prefillName,
  hideTrigger,
  onSaved,
}: AddContactProps) {
  const [isPending, startTransition] = useTransition();

  const pageTitle = editContact ? "Edit Contact" : "Add Contact";

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(AddContactFormSchema),
    defaultValues: prefillName
      ? { ...EMPTY_CONTACT, name: prefillName }
      : EMPTY_CONTACT,
  });

  const { reset } = form;

  // The shared-history fields only make sense for a reference
  const roleId = form.watch("contactRole");
  const isReference = roles.some(
    (role) => role.id === roleId && role.value === REFERENCE_ROLE_VALUE,
  );

  // Clear on an explicit role change only — an effect would also wipe the
  // history a non-reference contact was saved with the moment you open it
  const onRoleChange = (
    field: { onChange: (value: string) => void },
    value: string,
  ) => {
    field.onChange(value);
    const stillReference = roles.some(
      (role) => role.id === value && role.value === REFERENCE_ROLE_VALUE,
    );
    if (stillReference) return;
    form.setValue("relationship", "");
    form.setValue("workedAtCompany", "");
    form.setValue("workedFrom", null);
    form.setValue("workedTo", null);
  };

  useEffect(() => {
    if (editContact) {
      reset(
        {
          id: editContact.id,
          name: editContact.name ?? "",
          title: editContact.title ?? "",
          email: editContact.email ?? "",
          phone: editContact.phone ?? "",
          linkedinUrl: editContact.linkedinUrl ?? "",
          company: editContact.companyId ?? "",
          location: editContact.locationId ?? "",
          relationship: editContact.relationship ?? "",
          workedAtCompany: editContact.workedAtCompanyId ?? "",
          contactRole: editContact.roleId ?? "",
          workedFrom: editContact.workedFrom ?? null,
          workedTo: editContact.workedTo ?? null,
          notes: editContact.notes ?? "",
          lastContactedAt: editContact.lastContactedAt ?? null,
        },
        { keepDefaultValues: true },
      );
    } else if (prefillName) {
      reset({ ...EMPTY_CONTACT, name: prefillName }, { keepDefaultValues: true });
    }
  }, [editContact, prefillName, reset]);

  const openDialog = () => {
    if (!editContact) {
      reset();
      resetEditContact();
    }
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const onSubmit = (values: ContactFormValues) => {
    startTransition(async () => {
      const res = editContact
        ? await updateContact({ ...values, id: editContact.id })
        : await createContact(values);
      const name = values.name.trim();
      toastActionResult(res, {
        success: `Contact has been ${editContact ? "updated" : "created"} successfully`,
        onSuccess: () => {
          onSaved?.({ id: res.data.id, label: name, value: name.toLowerCase() });
          reset();
          setDialogOpen(false);
          resetEditContact();
          reloadContacts();
        },
      });
    });
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={openDialog}
          data-testid="add-contact-btn"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            New Contact
          </span>
        </Button>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pageTitle}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dana Whitfield" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Engineering Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +1 416 555 0134" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.linkedin.com/in/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SectionHeading>Where they work</SectionHeading>

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Company</FormLabel>
                    <Combobox options={companies} field={field} creatable fullWidth />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Location</FormLabel>
                    <Combobox options={locations} field={field} creatable fullWidth />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactRole"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Role</FormLabel>
                    <Combobox
                      options={roles}
                      field={{
                        ...field,
                        onChange: (value: string) => onRoleChange(field, value),
                      }}
                      creatable
                      fullWidth
                      label="role"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isReference && (
                <>
                  <SectionHeading>How you know them</SectionHeading>

                  <FormField
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. my manager, peer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workedAtCompany"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Worked together at</FormLabel>
                        <Combobox
                          options={companies}
                          field={field}
                          creatable
                          fullWidth
                          label="company"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* captionLayout gives the year dropdown: a 2019 start date is
                      otherwise a lot of clicking */}
                  <FormField
                    control={form.control}
                    name="workedFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>From</FormLabel>
                        <DatePicker
                          field={field}
                          presets={false}
                          isEnabled
                          captionLayout
                          fullWidth
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workedTo"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>To</FormLabel>
                        <DatePicker
                          field={field}
                          presets={false}
                          isEnabled
                          captionLayout
                          fullWidth
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <SectionHeading>Follow-up</SectionHeading>

              <FormField
                control={form.control}
                name="lastContactedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Last contacted</FormLabel>
                    <DatePicker
                      field={field}
                      presets={false}
                      isEnabled
                      captionLayout
                      fullWidth
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-24"
                          placeholder="How you met, what to follow up on..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormDialogFooter
                onCancel={closeDialog}
                isPending={isPending}
                saveDisabled={isPending}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddContact;
