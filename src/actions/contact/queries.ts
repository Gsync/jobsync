"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import { APP_CONSTANTS } from "@/lib/constants";

// Narrowed to what the table row and the expanded row render. Not shared: only
// this module reads it.
const CONTACT_LIST_INCLUDE = {
  Company: { select: { id: true, label: true } },
  Location: { select: { id: true, label: true } },
  WorkedAtCompany: { select: { id: true, label: true } },
  jobLinks: {
    include: {
      Role: true,
      Job: {
        select: {
          id: true,
          JobTitle: { select: { label: true } },
          Company: { select: { label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { jobLinks: true } },
};

// Contacts get their own query rather than getReferenceEntityList: that helper
// counts jobs grouped by an FK on Job, and a contact reaches Job only through
// JobContact. The role filter has no equivalent there either.
export const getContactList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  search?: string,
  roleId?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const where: any = { createdBy: user.id };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { title: { contains: search } },
      ];
    }
    if (roleId) {
      where.jobLinks = { some: { roleId } };
    }

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: CONTACT_LIST_INCLUDE,
        // Name only. The spec's cold-contact use for lastContactedAt implies a
        // sort, but a sortable header means an orderBy threaded through the
        // action and the list hook plus a nulls-last rule — deferred to v2.
        orderBy: [{ name: "asc" }],
      }),
      prisma.contact.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    return handleError(error, "Failed to fetch contact list. ");
  }
};

// The job-tab picker filters a preloaded array, so `value` carries everything
// worth searching on — name, email and employer.
export const getAllContacts = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const rows = await prisma.contact.findMany({
      where: { createdBy: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        Company: { select: { label: true } },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      value: [row.name, row.email, row.Company?.label]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }));
  } catch (error) {
    return handleError(error, "Failed to fetch contacts. ");
  }
};

export const getContactById = async (
  contactId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    return await prisma.contact.findFirst({
      where: { id: contactId, createdBy: user.id },
      include: CONTACT_LIST_INCLUDE,
    });
  } catch (error) {
    return handleError(error, "Failed to fetch contact. ");
  }
};
