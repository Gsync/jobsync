"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import type { ContactFormValues } from "@/models/addContactForm.schema";

// An untouched optional field arrives as "" from react-hook-form; storing that
// makes "has an email" untestable, so empty means null in the database.
const nullable = (value?: string | null) =>
  value && value.trim() ? value.trim() : null;

const toContactData = (values: ContactFormValues) => ({
  name: values.name.trim(),
  title: nullable(values.title),
  email: nullable(values.email),
  phone: nullable(values.phone),
  linkedinUrl: nullable(values.linkedinUrl),
  companyId: nullable(values.company),
  locationId: nullable(values.location),
  relationship: nullable(values.relationship),
  workedAtCompanyId: nullable(values.workedAtCompany),
  workedFrom: values.workedFrom ?? null,
  workedTo: values.workedTo ?? null,
  roleId: nullable(values.contactRole),
  notes: nullable(values.notes),
  lastContactedAt: values.lastContactedAt ?? null,
});

// Foreign keys prove a row exists, not that the caller owns it, so every
// referenced id is counted against the caller before it is written.
const assertContactRefsOwned = async (
  userId: string,
  data: ReturnType<typeof toContactData>,
) => {
  const companyIds = [
    ...new Set(
      [data.companyId, data.workedAtCompanyId].filter(
        (id): id is string => !!id,
      ),
    ),
  ];

  const [companies, location, role] = await Promise.all([
    companyIds.length > 0
      ? prisma.company.count({
          where: { id: { in: companyIds }, createdBy: userId },
        })
      : 0,
    data.locationId
      ? prisma.location.count({
          where: { id: data.locationId, createdBy: userId },
        })
      : 1,
    data.roleId
      ? prisma.contactRole.count({
          where: { id: data.roleId, createdBy: userId },
        })
      : 1,
  ]);

  if (companies !== companyIds.length) throw new Error("Company not found");
  if (location === 0) throw new Error("Location not found");
  if (role === 0) throw new Error("Role not found");
};

export const createContact = async (
  values: ContactFormValues,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const contactData = toContactData(values);
    await assertContactRefsOwned(user.id, contactData);

    const data = await prisma.contact.create({
      data: { ...contactData, createdBy: user.id },
    });
    return { success: true, data };
  } catch (error) {
    return handleError(error, "Failed to create contact.");
  }
};

export const updateContact = async (
  values: ContactFormValues,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    if (!values.id) throw new Error("Please provide a contact id");

    const contactData = toContactData(values);
    await assertContactRefsOwned(user.id, contactData);

    // updateMany, not update: a unique-where cannot carry createdBy, and a
    // count of 0 is how a contact belonging to someone else surfaces.
    const res = await prisma.contact.updateMany({
      where: { id: values.id, createdBy: user.id },
      data: contactData,
    });
    if (res.count === 0) throw new Error("Contact not found");

    return { success: true, data: { id: values.id } };
  } catch (error) {
    return handleError(error, "Failed to update contact.");
  }
};

export const deleteContactById = async (
  contactId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // JobContact cascades from Contact, so the links go with the person.
    const res = await prisma.contact.deleteMany({
      where: { id: contactId, createdBy: user.id },
    });
    if (res.count === 0) throw new Error("Contact not found");

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete contact.");
  }
};
