// Not a "use server" module: contact/queries.ts and company/queries.ts both
// read contacts in the shape ContactsTable and ContactRow render.
export const CONTACT_LIST_INCLUDE = {
  Role: true,
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
