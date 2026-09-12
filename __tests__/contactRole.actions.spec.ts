import {
  getAllContactRoles,
  getContactRoleList,
  createContactRole,
  deleteContactRoleById,
} from "@/actions/contactRole.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";
import { resolveContactRole } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => ({
  default: {
    contactRole: {
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    jobContact: { count: vi.fn() },
  },
}));

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({ resolveContactRole: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

describe("contactRole actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
  });

  it("lists roles scoped to the user with their link counts", async () => {
    db.contactRole.findMany.mockResolvedValue([]);
    db.contactRole.count.mockResolvedValue(0);

    await getContactRoleList(1, 10);

    expect(db.contactRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: user.id },
        skip: 0,
        take: 10,
        include: { _count: { select: { jobContacts: true } } },
        orderBy: [{ label: "asc" }],
      }),
    );
  });

  it("filters the list by label when a search term is given", async () => {
    db.contactRole.findMany.mockResolvedValue([]);
    db.contactRole.count.mockResolvedValue(0);

    await getContactRoleList(1, 10, "recr");

    expect(db.contactRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: user.id, label: { contains: "recr" } },
      }),
    );
  });

  it("creates through the resolver so casing collapses", async () => {
    (resolveContactRole as any).mockResolvedValue({
      id: "r1",
      label: "Recruiter",
      created: true,
    });

    const res = await createContactRole("recruiter");

    expect(resolveContactRole).toHaveBeenCalledWith("recruiter", user.id);
    expect(res).toEqual({
      success: true,
      data: { id: "r1", label: "Recruiter", created: true },
    });
  });

  it("refuses to delete a role that is in use, naming the count", async () => {
    db.jobContact.count.mockResolvedValue(3);

    const res = await deleteContactRoleById("r1");

    expect(res.success).toBe(false);
    expect(res.message).toContain("3");
    expect(db.contactRole.delete).not.toHaveBeenCalled();
  });

  it("counts only links on this user's jobs when guarding a delete", async () => {
    db.jobContact.count.mockResolvedValue(0);
    db.contactRole.delete.mockResolvedValue({ id: "r1" });

    await deleteContactRoleById("r1");

    expect(db.jobContact.count).toHaveBeenCalledWith({
      where: { roleId: "r1", Job: { userId: user.id } },
    });
    expect(db.contactRole.delete).toHaveBeenCalledWith({
      where: { id: "r1", createdBy: user.id },
    });
  });

  it("returns all roles for the picker, scoped to the user", async () => {
    db.contactRole.findMany.mockResolvedValue([]);

    await getAllContactRoles();

    expect(db.contactRole.findMany).toHaveBeenCalledWith({
      where: { createdBy: user.id },
      orderBy: { label: "asc" },
    });
  });
});
