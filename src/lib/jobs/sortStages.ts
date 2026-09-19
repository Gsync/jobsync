// SQLite sorts NULL first on ASC and Prisma's nulls:"last" is unsupported on
// that connector, so undated-stages-last cannot live in the query. Both the
// server actions and the Timeline tab sort through this one comparator: the
// job-details page loads stages with no orderBy at all.
export function sortStages<
  T extends { occurredAt: Date | null; createdAt: Date },
>(stages: T[]): T[] {
  return [...stages].sort((a, b) => {
    if (a.occurredAt && b.occurredAt) {
      const diff = a.occurredAt.getTime() - b.occurredAt.getTime();
      if (diff !== 0) return diff;
    } else if (a.occurredAt) {
      return -1;
    } else if (b.occurredAt) {
      return 1;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
