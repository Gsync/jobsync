import {
  getWatchedBoards,
  setCompanyWatched,
  watchBoardCompany,
} from "@/actions/company.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    company: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

describe("watchBoardCompany", () => {
  const mockUser = { id: "user-id" };
  const board = { name: "Acme Inc.", token: "acme" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
  });

  it("creates a watched company when no row matches", async () => {
    (prisma.company.findFirst as any).mockResolvedValue(null);
    (prisma.company.create as any).mockResolvedValue({ id: "new-id" });

    const res = await watchBoardCompany("greenhouse", board);

    expect(res).toEqual({
      success: true,
      data: { companyId: "new-id", merged: false },
    });
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdBy: mockUser.id,
        label: "Acme Inc.",
        value: "acme",
        watched: true,
        atsProvider: "greenhouse",
        atsToken: "acme",
        atsHost: null,
      }),
    });
  });

  it("is idempotent when the same board is already watched", async () => {
    (prisma.company.findFirst as any).mockResolvedValueOnce({
      id: "existing-id",
      label: "Acme Inc.",
      atsToken: "acme",
    });
    (prisma.company.update as any).mockResolvedValue({ id: "existing-id" });

    const res = await watchBoardCompany("greenhouse", board);

    expect(res).toEqual({
      success: true,
      data: { companyId: "existing-id", merged: false },
    });
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it("asks for confirmation before merging onto a namesake with no board", async () => {
    (prisma.company.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acme-id", label: "Acme", atsToken: null });

    const res = await watchBoardCompany("greenhouse", board);

    expect(res).toEqual({
      success: false,
      needsConfirm: true,
      existing: { id: "acme-id", label: "Acme" },
    });
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it("merges onto the namesake when confirmMerge is set", async () => {
    (prisma.company.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acme-id", label: "Acme", atsToken: null });
    (prisma.company.update as any).mockResolvedValue({ id: "acme-id" });

    const res = await watchBoardCompany("greenhouse", board, {
      confirmMerge: true,
    });

    expect(res).toEqual({
      success: true,
      data: { companyId: "acme-id", merged: true },
    });
  });

  it("rejects a second board for an already-linked company", async () => {
    (prisma.company.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "acme-id",
        label: "Acme",
        atsProvider: "lever",
        atsToken: "acme-lever",
      });

    const res = await watchBoardCompany("greenhouse", board);

    expect(res.success).toBe(false);
    expect((res as any).message).toContain("Acme");
    expect((res as any).message).toContain("lever");
    expect((res as any).needsConfirm).toBeUndefined();
  });

  it("resolves successfully when a concurrent writer wins the create", async () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    (prisma.company.findFirst as any)
      .mockResolvedValueOnce(null) // step 2: by (provider, token)
      .mockResolvedValueOnce(null) // step 3: by value
      .mockResolvedValueOnce({ id: "raced-id", label: "Acme Inc." }); // retry
    (prisma.company.create as any).mockRejectedValue(p2002);
    (prisma.company.update as any).mockResolvedValue({ id: "raced-id" });

    const res = await watchBoardCompany("greenhouse", board);

    expect(res).toEqual({
      success: true,
      data: { companyId: "raced-id", merged: false },
    });
  });

  it("writes atsHost only for Lever", async () => {
    (prisma.company.findFirst as any).mockResolvedValue(null);
    (prisma.company.create as any).mockResolvedValue({ id: "id" });

    await watchBoardCompany("lever", { ...board, host: "eu" });
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ atsProvider: "lever", atsHost: "eu" }),
    });

    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.company.findFirst as any).mockResolvedValue(null);
    (prisma.company.create as any).mockResolvedValue({ id: "id" });

    await watchBoardCompany("lever", board);
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ atsHost: "default" }),
    });
  });

  it("returns Not authenticated with no user", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    await expect(watchBoardCompany("greenhouse", board)).resolves.toEqual({
      success: false,
      message: "Not authenticated",
    });
  });
});

describe("setCompanyWatched", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
  });

  it("scopes the update by owner and does not clear board coordinates", async () => {
    (prisma.company.update as any).mockResolvedValue({ id: "c1" });

    const res = await setCompanyWatched("c1", false);

    expect(res.success).toBe(true);
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: "c1", createdBy: mockUser.id },
      data: { watched: false, watchedAt: null },
    });
  });

  it("stamps watchedAt when watching", async () => {
    (prisma.company.update as any).mockResolvedValue({ id: "c1" });

    await setCompanyWatched("c1", true);

    const args = (prisma.company.update as any).mock.calls[0][0];
    expect(args.data.watched).toBe(true);
    expect(args.data.watchedAt).toBeInstanceOf(Date);
  });
});

describe("getWatchedBoards", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
  });

  it("filters to watched board-backed rows for one provider", async () => {
    (prisma.company.findMany as any).mockResolvedValue([
      {
        id: "c1",
        label: "Acme",
        atsToken: "acme",
        atsHost: null,
        atsProvider: "greenhouse",
      },
    ]);

    const res = await getWatchedBoards("greenhouse");

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: {
        createdBy: mockUser.id,
        watched: true,
        atsToken: { not: null },
        atsProvider: "greenhouse",
      },
      select: {
        id: true,
        label: true,
        atsToken: true,
        atsHost: true,
        atsProvider: true,
      },
      orderBy: { label: "asc" },
    });
    expect(res).toEqual([
      { id: "c1", name: "Acme", token: "acme", provider: "greenhouse" },
    ]);
  });

  it("omits the provider filter when none is given", async () => {
    (prisma.company.findMany as any).mockResolvedValue([]);
    await getWatchedBoards();
    const args = (prisma.company.findMany as any).mock.calls[0][0];
    expect(args.where.atsProvider).toBeUndefined();
  });

  it("returns an empty array with no user", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    await expect(getWatchedBoards()).resolves.toEqual([]);
  });
});
