import { getReferenceEntityList } from "@/actions/referenceList";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: {
      groupBy: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

describe("getReferenceEntityList", () => {
  const userId = "user-id";

  const makeModel = (data: any[] = [], total = 0) => ({
    findMany: vi.fn().mockResolvedValue(data),
    count: vi.fn().mockResolvedValue(total),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries without a select and issues no groupBy when countBy is absent", async () => {
    const data = [{ id: "a", label: "A", value: "a" }];
    const model = makeModel(data, 1);

    const result = await getReferenceEntityList({
      model,
      userId,
      fkField: "locationId",
      appliedRelation: "jobsApplied",
      page: 1,
      limit: 10,
    });

    expect(result).toEqual({ data, total: 1 });
    expect(model.findMany).toHaveBeenCalledWith({
      where: { createdBy: userId },
      skip: 0,
      take: 10,
      orderBy: [{ jobsApplied: { _count: "desc" } }, { label: "asc" }],
    });
    expect(model.count).toHaveBeenCalledWith({ where: { createdBy: userId } });
    expect(prisma.job.groupBy).not.toHaveBeenCalled();
  });

  it("uses the supplied relation name in both select and orderBy", async () => {
    const model = makeModel([{ id: "a", label: "A", value: "a" }], 1);
    (prisma.job.groupBy as any).mockResolvedValue([]);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "jobTitleId",
      appliedRelation: "jobs",
      page: 1,
      limit: 10,
      countBy: "applied",
    });

    expect(model.findMany).toHaveBeenCalledWith({
      where: { createdBy: userId },
      skip: 0,
      take: 10,
      select: {
        id: true,
        label: true,
        value: true,
        _count: {
          select: {
            jobs: { where: { applied: true } },
          },
        },
      },
      orderBy: [{ jobs: { _count: "desc" } }, { label: "asc" }],
    });
  });

  it("merges extraSelect fields into the select", async () => {
    const model = makeModel([{ id: "a", label: "A", value: "a" }], 1);
    (prisma.job.groupBy as any).mockResolvedValue([]);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      extraSelect: { logoUrl: true },
      page: 1,
      limit: 10,
      countBy: "applied",
    });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          label: true,
          value: true,
          logoUrl: true,
          _count: {
            select: {
              jobsApplied: { where: { applied: true } },
            },
          },
        },
      })
    );
  });

  it("splices jobsTotal onto each row from the base groupBy", async () => {
    const model = makeModel(
      [
        { id: "a", label: "A", value: "a", _count: { jobsApplied: 2 } },
        { id: "b", label: "B", value: "b", _count: { jobsApplied: 0 } },
      ],
      2
    );
    (prisma.job.groupBy as any).mockResolvedValue([
      { locationId: "a", _count: { id: 7 } },
    ]);

    const result = await getReferenceEntityList({
      model,
      userId,
      fkField: "locationId",
      appliedRelation: "jobsApplied",
      page: 1,
      limit: 10,
      countBy: "applied",
    });

    expect(prisma.job.groupBy).toHaveBeenCalledWith({
      by: ["locationId"],
      where: { userId },
      _count: { id: true },
    });
    expect(result.data).toEqual([
      { id: "a", label: "A", value: "a", _count: { jobsApplied: 2, jobsTotal: 7 } },
      { id: "b", label: "B", value: "b", _count: { jobsApplied: 0, jobsTotal: 0 } },
    ]);
  });

  it("splices each extraCount under its own key with its own filter", async () => {
    const model = makeModel(
      [{ id: "a", label: "A", value: "a", _count: { jobsApplied: 2 } }],
      1
    );
    (prisma.job.groupBy as any)
      .mockResolvedValueOnce([{ companyId: "a", _count: { id: 3 } }])
      .mockResolvedValueOnce([{ companyId: "a", _count: { id: 9 } }]);

    const result = await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      extraCounts: [
        { key: "jobsRejected", where: { Status: { value: "rejected" } } },
      ],
      page: 1,
      limit: 10,
      countBy: "applied",
    });

    expect(prisma.job.groupBy).toHaveBeenNthCalledWith(1, {
      by: ["companyId"],
      where: { userId, Status: { value: "rejected" } },
      _count: { id: true },
    });
    expect(prisma.job.groupBy).toHaveBeenNthCalledWith(2, {
      by: ["companyId"],
      where: { userId },
      _count: { id: true },
    });
    expect(result.data).toEqual([
      {
        id: "a",
        label: "A",
        value: "a",
        _count: { jobsApplied: 2, jobsRejected: 3, jobsTotal: 9 },
      },
    ]);
  });

  it("applies a label filter to findMany and count when search is provided", async () => {
    const model = makeModel([], 0);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      page: 1,
      limit: 10,
      search: "Ama",
    });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: userId, OR: [{ label: { contains: "Ama" } }] },
      })
    );
    expect(model.count).toHaveBeenCalledWith({
      where: { createdBy: userId, OR: [{ label: { contains: "Ama" } }] },
    });
  });

  it("does not apply a label filter when search is an empty string", async () => {
    const model = makeModel([], 0);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      page: 1,
      limit: 10,
      search: "",
    });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdBy: userId } })
    );
  });

  it("computes skip from page and limit", async () => {
    const model = makeModel([], 0);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "locationId",
      appliedRelation: "jobsApplied",
      page: 3,
      limit: 5,
    });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });

  it("returns rows untouched when countBy is absent even if groupBy data exists", async () => {
    const data = [{ id: "a", label: "A", value: "a" }];
    const model = makeModel(data, 1);

    const result = await getReferenceEntityList({
      model,
      userId,
      fkField: "locationId",
      appliedRelation: "jobsApplied",
      page: 1,
      limit: 10,
    });

    expect(result.data).toBe(data);
  });

  it("propagates a delegate rejection to the caller", async () => {
    const model = makeModel();
    model.findMany.mockRejectedValue(new Error("Database error"));

    await expect(
      getReferenceEntityList({
        model,
        userId,
        fkField: "locationId",
        appliedRelation: "jobsApplied",
        page: 1,
        limit: 10,
      })
    ).rejects.toThrow("Database error");
  });

  it("merges extraWhere into the where clause for both findMany and count", async () => {
    const model = makeModel([], 0);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      extraWhere: { watched: true },
      page: 1,
      limit: 10,
    });

    const expected = { createdBy: userId, watched: true };
    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expected })
    );
    expect(model.count).toHaveBeenCalledWith({ where: expected });
  });

  it("builds an OR clause across every searchField", async () => {
    const model = makeModel([], 0);

    await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      searchFields: ["label", "atsToken"],
      search: "acme",
      page: 1,
      limit: 10,
    });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdBy: userId,
          OR: [
            { label: { contains: "acme" } },
            { atsToken: { contains: "acme" } },
          ],
        },
      })
    );
  });

  it("uses the supplied orderBy over the default tiebreak", async () => {
    const model = makeModel([], 0);
    const orderBy = [{ watchedAt: "desc" }, { label: "asc" }];

    await getReferenceEntityList({
      model,
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      orderBy,
      page: 1,
      limit: 10,
    });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy })
    );
  });
  describe("relationCounts", () => {
    const base = {
      userId,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      page: 1,
      limit: 10,
      countBy: "applied",
    };

    it("merges a relation count into the same _count.select, costing no extra query", async () => {
      const model = makeModel([]);

      await getReferenceEntityList({
        ...base,
        model,
        relationCounts: [
          { key: "contacts", relation: "contacts", where: { createdBy: "u1" } },
        ],
      });

      const select = model.findMany.mock.calls[0][0].select;
      expect(select._count.select).toEqual({
        jobsApplied: { where: { applied: true } },
        contacts: { where: { createdBy: "u1" } },
      });
    });

    it("counts the whole relation when no where is given", async () => {
      const model = makeModel([]);

      await getReferenceEntityList({
        ...base,
        model,
        relationCounts: [{ key: "contacts", relation: "contacts" }],
      });

      expect(
        model.findMany.mock.calls[0][0].select._count.select.contacts
      ).toBe(true);
    });

    it("renames the relation to the requested key on the returned rows", async () => {
      const model = makeModel([
        {
          id: "c1",
          label: "Shopify",
          value: "shopify",
          _count: { jobsApplied: 2, formerColleagues: 4 },
        },
      ]);

      const { data } = await getReferenceEntityList({
        ...base,
        model,
        relationCounts: [{ key: "exColleagues", relation: "formerColleagues" }],
      });

      expect(data[0]._count.exColleagues).toBe(4);
      expect(data[0]._count).not.toHaveProperty("formerColleagues");
    });

    it("leaves the query untouched when no relationCounts are given", async () => {
      const model = makeModel([]);

      await getReferenceEntityList({ ...base, model });

      expect(model.findMany.mock.calls[0][0].select._count.select).toEqual({
        jobsApplied: { where: { applied: true } },
      });
    });
  });
});