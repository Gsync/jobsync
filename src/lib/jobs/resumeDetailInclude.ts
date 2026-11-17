// Shared Prisma `include` for a full resume with relations, as consumed by
// preprocessResume/convertResumeToText. Extracted so both the session-scoped
// getResumeById (profile.actions.ts) and the userId-scoped
// getDefaultResumeForUser (MCP path) stay in sync. profile.actions.ts has
// "use server" at the top, which only allows async-function exports, so this
// object can't live there directly.
// Postgres returns rows in storage order and an UPDATE moves the row, so an
// unordered relation would reshuffle a resume after any edit.
export const ENTRY_ORDER = [
  { createdAt: "asc" as const },
  { id: "asc" as const },
];
// No createdAt on this model: newest credential first, undated ones last
export const CERTIFICATION_ORDER = [
  { issueDate: { sort: "desc" as const, nulls: "last" as const } },
  { title: "asc" as const },
  { id: "asc" as const },
];

export const resumeDetailInclude = {
  ContactInfo: true,
  File: true,
  ResumeSections: {
    orderBy: { id: "asc" },
    include: {
      summary: true,
      workExperiences: {
        orderBy: ENTRY_ORDER,
        include: {
          jobTitle: true,
          Company: true,
          location: true,
        },
      },
      educations: {
        orderBy: ENTRY_ORDER,
        include: {
          location: true,
        },
      },
      licenseOrCertifications: { orderBy: CERTIFICATION_ORDER },
      skills: { include: { Tag: true } },
    },
  },
} as const;
