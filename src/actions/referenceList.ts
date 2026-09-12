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

// Merged into the inline _count.select, unlike extraCounts — which is a
// per-entry prisma.job.groupBy and can therefore only ever count jobs.
export type ReferenceRelationCount = {
  key: string;
  relation: string;
  where?: Record<string, any>;
};

export type ReferenceListParams = {
  model: ReferenceListDelegate;
  userId: string;
  fkField: string;
  appliedRelation: string;
  extraSelect?: Record<string, true>;
  extraCounts?: ReferenceExtraCount[];
  relationCounts?: ReferenceRelationCount[];
  extraWhere?: Record<string, any>;
  searchFields?: string[];
  orderBy?: any;
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
  relationCounts,
  extraWhere,
  searchFields,
  orderBy,
  page,
  limit,
  countBy,
  search,
}: ReferenceListParams): Promise<{ data: any; total: number }> => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    createdBy: userId,
    ...extraWhere,
  };

  if (search) {
    const fields = searchFields ?? ["label"];
    whereClause.OR = fields.map((field) => ({
      [field]: { contains: search },
    }));
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
                  ...Object.fromEntries(
                    (relationCounts ?? []).map((rc) => [
                      rc.relation,
                      rc.where ? { where: rc.where } : true,
                    ])
                  ),
                },
              },
            },
          }
        : {}),
      // Two keys, not one: the applied-count sort alone has no tiebreak, so
      // equal-count rows page unstably under infinite scroll.
      orderBy: orderBy ?? [
        { [appliedRelation]: { _count: "desc" } },
        { label: "asc" },
      ],
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

  const dataWithCounts = (data as any[]).map((entity) => {
    const counts = { ...(entity._count ?? {}) };
    for (const rc of relationCounts ?? []) {
      if (rc.key === rc.relation) continue;
      counts[rc.key] = counts[rc.relation] ?? 0;
      delete counts[rc.relation];
    }
    return {
      ...entity,
      _count: {
        ...counts,
        ...Object.fromEntries(
          maps.map(({ key, counts: m }) => [key, m.get(entity.id) ?? 0])
        ),
      },
    };
  });

  return { data: dataWithCounts, total };
};
