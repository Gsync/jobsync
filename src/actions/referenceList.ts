import prisma from "@/lib/db";

// Not a "use server" module: it takes a Prisma delegate as an argument, so it
// must never become a callable server-action endpoint.

export type ReferenceListDelegate = {
  findMany: (args: any) => Promise<any>;
  count: (args: any) => Promise<any>;
};

export type ReferenceExtraCount = {
  key: string;
  where: Record<string, any>;
};

export type ReferenceListParams = {
  model: ReferenceListDelegate;
  userId: string;
  fkField: string;
  appliedRelation: string;
  extraSelect?: Record<string, true>;
  extraCounts?: ReferenceExtraCount[];
  page: number;
  limit: number;
  countBy?: string;
  search?: string;
};

export const getReferenceEntityList = async ({
  model,
  userId,
  fkField,
  appliedRelation,
  extraSelect,
  extraCounts,
  page,
  limit,
  countBy,
  search,
}: ReferenceListParams): Promise<{ data: any; total: number }> => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    createdBy: userId,
  };

  if (search) {
    whereClause.label = { contains: search };
  }

  // Prisma can only count the applied relation inline, so every other tally
  // comes from its own groupBy and is spliced on below.
  const countSpecs = countBy
    ? [
        ...(extraCounts ?? []).map((extra) => ({
          key: extra.key,
          where: { userId, ...extra.where },
        })),
        { key: "jobsTotal", where: { userId } },
      ]
    : [];

  const [data, total, ...groups] = await Promise.all([
    model.findMany({
      where: whereClause,
      skip,
      take: limit,
      ...(countBy
        ? {
            select: {
              id: true,
              label: true,
              value: true,
              ...extraSelect,
              _count: {
                select: {
                  [appliedRelation]: {
                    where: {
                      applied: true,
                    },
                  },
                },
              },
            },
          }
        : {}),
      orderBy: {
        [appliedRelation]: {
          _count: "desc",
        },
      },
    }),
    model.count({
      where: whereClause,
    }),
    // Prisma's groupBy generics need a literal `by` tuple; ours is dynamic.
    ...countSpecs.map((spec) =>
      (prisma.job.groupBy as any)({
        by: [fkField],
        where: spec.where,
        _count: { id: true },
      })
    ),
  ]);

  if (!countBy) {
    return { data, total };
  }

  const maps = countSpecs.map((spec, index) => ({
    key: spec.key,
    counts: new Map(
      (groups[index] ?? []).map((row: any) => [row[fkField], row._count.id])
    ),
  }));

  const dataWithCounts = (data as any[]).map((entity) => ({
    ...entity,
    _count: {
      ...(entity._count ?? {}),
      ...Object.fromEntries(
        maps.map(({ key, counts }) => [key, counts.get(entity.id) ?? 0])
      ),
    },
  }));

  return { data: dataWithCounts, total };
};
