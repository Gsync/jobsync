import type { SortDir, SortState } from "@/models/sort.model";

// Not a "use server" module: it takes a Prisma delegate as an argument, so it
// must never become a callable server-action endpoint.

type Where = Record<string, unknown>;
type OrderBy = Record<string, unknown>;

export type ListSortDelegate = {
  findMany: (args: any) => Promise<any>;
  count: (args: any) => Promise<any>;
};

// `blanks` marks a column that can be empty. `hasValue` and `noValue` must be
// exact complements under the page's where clause.
export type SortFieldSpec = {
  orderBy: (dir: SortDir) => OrderBy;
  blanks?: { hasValue: Where; noValue: Where };
};

export type ListSortPlan = {
  orderBy: OrderBy[];
  blanks?: { hasValue: Where; noValue: Where; orderBy: OrderBy[] };
};

// Equal sort keys otherwise shuffle between pages under infinite scroll.
const ID_TIEBREAK: OrderBy = { id: "desc" };

export function planListSort(
  sort: SortState | null | undefined,
  fields: Record<string, SortFieldSpec>,
  fallback: OrderBy[],
): ListSortPlan {
  const base = [...fallback, ID_TIEBREAK];
  // Sort input comes from the client; "constructor" must not hit the prototype.
  const spec =
    sort && Object.prototype.hasOwnProperty.call(fields, sort.field)
      ? fields[sort.field]
      : undefined;
  if (!sort || !spec || (sort.dir !== "asc" && sort.dir !== "desc")) {
    return { orderBy: base };
  }
  return {
    orderBy: [spec.orderBy(sort.dir), ...base],
    ...(spec.blanks && { blanks: { ...spec.blanks, orderBy: base } }),
  };
}

const withCondition = (where: Where, extra: Where): Where => {
  const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  return { ...where, AND: [...and, extra] };
};

// SQLite has no NULLS LAST and Prisma's `nulls` option is unsupported there,
// so valued rows page first and the list continues into the blank ones.
export async function findManySorted(
  model: ListSortDelegate,
  query: { where: Where; skip: number; take: number; select?: unknown },
  plan: ListSortPlan,
): Promise<{ data: any[]; total: number }> {
  const { where, skip, take, ...shape } = query;

  if (!plan.blanks) {
    const [data, total] = await Promise.all([
      model.findMany({ where, skip, take, orderBy: plan.orderBy, ...shape }),
      model.count({ where }),
    ]);
    return { data, total };
  }

  const valuedWhere = withCondition(where, plan.blanks.hasValue);
  const blankWhere = withCondition(where, plan.blanks.noValue);
  // Summing the halves keeps the total equal to the rows scroll can reach.
  const [valuedTotal, blankTotal] = await Promise.all([
    model.count({ where: valuedWhere }),
    model.count({ where: blankWhere }),
  ]);

  const valuedTake = Math.min(take, Math.max(0, valuedTotal - skip));
  const valued =
    valuedTake > 0
      ? await model.findMany({
          where: valuedWhere,
          skip,
          take: valuedTake,
          orderBy: plan.orderBy,
          ...shape,
        })
      : [];

  const blankTake = take - valued.length;
  const blank =
    blankTake > 0 && blankTotal > 0
      ? await model.findMany({
          where: blankWhere,
          skip: Math.max(0, skip - valuedTotal),
          take: blankTake,
          orderBy: plan.blanks.orderBy,
          ...shape,
        })
      : [];

  return { data: [...valued, ...blank], total: valuedTotal + blankTotal };
}
