// Stage order is the Library -> Stages order (JobStageType.sortOrder), not
// chronology: a job is routinely added days after it was applied to, so the
// New stage's date (when the job entered JobSync) postdates the Applied
// stage's. Dates break ties within one sortOrder. Undated stages sort last
// among their peers — SQLite sorts NULL first on ASC and Prisma's
// nulls:"last" is unsupported there, so none of this can live in the query.
// Both the server actions and the Timeline tab sort through this one
// comparator: the job-details page loads stages with no orderBy at all.
export function sortStages<
  T extends {
    occurredAt: Date | null;
    createdAt: Date;
    StageType: { sortOrder: number };
  },
>(stages: T[]): T[] {
  return [...stages].sort((a, b) => {
    const byStage = a.StageType.sortOrder - b.StageType.sortOrder;
    if (byStage !== 0) return byStage;

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
