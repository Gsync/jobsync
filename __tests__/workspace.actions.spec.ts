import { getWorkspaces, createWorkspace, ensureDefaultWorkspaces } from "@/actions/workspace/workspace.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    workspace: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    job: { count: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const prisma = new PrismaClient() as unknown as {
  workspace: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};
const mockUser = vi.mocked(getCurrentUser);

describe("workspace actions", () => {
  beforeEach(() => mockUser.mockResolvedValue({ id: "u1" } as never));

  it("creates a SCHOOL workspace with 6 default stages", async () => {
    prisma.workspace.create.mockResolvedValue({ id: "w1" });
    const res = await createWorkspace("School", "SCHOOL");
    expect(res.success).toBe(true);
    const payload = prisma.workspace.create.mock.calls[0][0];
    expect(payload.data.stages.create).toHaveLength(6);
    expect(payload.data.stages.create[0]).toMatchObject({ name: "Researching", order: 1 });
  });

  it("rejects empty names and bad types", async () => {
    expect((await createWorkspace("  ", "SCHOOL")).success).not.toBe(true);
    expect((await createWorkspace("X", "PHD" as never)).success).not.toBe(true);
  });

  it("ensureDefaultWorkspaces only creates what is missing", async () => {
    prisma.workspace.findMany.mockResolvedValue([{ id: "w0", type: "JOB" }]);
    prisma.workspace.create.mockResolvedValue({ id: "w1", type: "SCHOOL" });
    const res = (await ensureDefaultWorkspaces()) as {
      success: boolean;
      data: { id: string; type: string }[];
    };
    expect(prisma.workspace.create).toHaveBeenCalledTimes(1);
    expect(prisma.workspace.create.mock.calls[0][0].data.type).toBe("SCHOOL");
    expect(res.data).toHaveLength(2);
  });

  it("getWorkspaces scopes to the user", async () => {
    prisma.workspace.findMany.mockResolvedValue([]);
    await getWorkspaces();
    expect(prisma.workspace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });
});
