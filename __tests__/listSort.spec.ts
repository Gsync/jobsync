import { findManySorted, planListSort, SortFieldSpec } from "@/lib/listSort";

const hasValue = { v: { not: null } };
const noValue = { v: null };

const FIELDS: Record<string, SortFieldSpec> = {
  name: { orderBy: (dir) => ({ name: dir }) },
  v: { orderBy: (dir) => ({ v: dir }), blanks: { hasValue, noValue } },
};
const FALLBACK = [{ createdAt: "desc" }];
const BASE = [{ createdAt: "desc" }, { id: "desc" }];

describe("planListSort", () => {
  it("defaults to the fallback plus an id tiebreaker", () => {
    expect(planListSort(null, FIELDS, FALLBACK)).toEqual({ orderBy: BASE });
  });

  it("puts the chosen field before the fallback", () => {
    expect(planListSort({ field: "name", dir: "asc" }, FIELDS, FALLBACK)).toEqual({
      orderBy: [{ name: "asc" }, ...BASE],
    });
  });

  it("carries blanks with the fallback order for the blank half", () => {
    expect(planListSort({ field: "v", dir: "desc" }, FIELDS, FALLBACK)).toEqual({
      orderBy: [{ v: "desc" }, ...BASE],
      blanks: { hasValue, noValue, orderBy: BASE },
    });
  });

  it.each([
    { field: "userId", dir: "asc" },
    { field: "constructor", dir: "asc" },
    { field: "name", dir: "sideways" },
  ])("falls back on untrusted input %o", (sort) => {
    expect(planListSort(sort as any, FIELDS, FALLBACK)).toEqual({ orderBy: BASE });
  });
});

describe("findManySorted", () => {
  const valued = ["a", "b", "c"];
  const blank = ["x", "y"];

  // Stands in for Prisma: routes on which partition condition was appended.
  function fakeModel() {
    const rowsFor = (where: any) => {
      const last = where.AND?.[where.AND.length - 1];
      if (last === hasValue) return valued;
      if (last === noValue) return blank;
      return [...valued, ...blank];
    };
    return {
      findMany: vi.fn(async ({ where, skip, take }: any) =>
        rowsFor(where).slice(skip, skip + take),
      ),
      count: vi.fn(async ({ where }: any) => rowsFor(where).length),
    };
  }

  const plan = planListSort({ field: "v", dir: "desc" }, FIELDS, FALLBACK);

  it("uses one query and count when the field has no blanks", async () => {
    const model = fakeModel();
    const res = await findManySorted(
      model,
      { where: { userId: "u" }, skip: 0, take: 10 },
      planListSort(null, FIELDS, FALLBACK),
    );
    expect(model.findMany).toHaveBeenCalledTimes(1);
    expect(res.total).toBe(5);
  });

  it("pages concatenate to the full list with blanks last", async () => {
    const model = fakeModel();
    const pages = [];
    for (const skip of [0, 2, 4]) {
      const res = await findManySorted(
        model,
        { where: { userId: "u" }, skip, take: 2 },
        plan,
      );
      expect(res.total).toBe(5);
      pages.push(...res.data);
    }
    expect(pages).toEqual(["a", "b", "c", "x", "y"]);
  });

  it("orders the blank half by the fallback, not the sorted field", async () => {
    const model = fakeModel();
    await findManySorted(model, { where: {}, skip: 2, take: 2 }, plan);
    const blankCall = model.findMany.mock.calls[1][0];
    expect(blankCall.orderBy).toEqual(BASE);
    expect(blankCall.skip).toBe(0);
  });

  it("keeps an existing AND and passes select through", async () => {
    const model = fakeModel();
    const existing = { status: "open" };
    await findManySorted(
      model,
      { where: { AND: [existing] }, skip: 0, take: 2, select: { id: true } },
      plan,
    );
    const call = model.findMany.mock.calls[0][0];
    expect(call.where.AND).toEqual([existing, hasValue]);
    expect(call.select).toEqual({ id: true });
  });
});
