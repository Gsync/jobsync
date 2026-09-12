import {
  getContactList,
  getAllContacts,
  createContact,
  updateContact,
  deleteContactById,
} from "@/actions/contact.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    contact: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

describe("contact actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
    db.contact.findMany.mockResolvedValue([]);
    db.contact.count.mockResolvedValue(0);
  });

  describe("getContactList", () => {
    it("scopes to the user", async () => {
      await getContactList();
      expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
        createdBy: user.id,
      });
    });

    it("searches name, email and title", async () => {
      await getContactList(1, 10, "pat");
      expect(db.contact.findMany.mock.calls[0][0].where.OR).toEqual([
        { name: { contains: "pat" } },
        { email: { contains: "pat" } },
        { title: { contains: "pat" } },
      ]);
    });

    it("filters on the standing role or one held through any job link", async () => {
      await getContactList(1, 10, undefined, "role-1");
      expect(db.contact.findMany.mock.calls[0][0].where.AND).toEqual([
        {
          OR: [
            { roleId: "role-1" },
            { jobLinks: { some: { roleId: "role-1" } } },
          ],
        },
      ]);
    });

    it("pages with skip and take", async () => {
      await getContactList(3, 10);
      const args = db.contact.findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });
  });

  describe("getAllContacts", () => {
    it("returns picker rows whose value carries the email, so search finds it", async () => {
      db.contact.findMany.mockResolvedValue([
        { id: "c1", name: "Dave Patel", email: "dave@x.com", Company: { label: "Shopify" } },
      ]);

      const res = await getAllContacts();

      expect(res).toEqual([
        { id: "c1", label: "Dave Patel", value: "dave patel dave@x.com shopify" },
      ]);
    });
  });

  describe("createContact", () => {
    it("writes createdBy from the session, never from the payload", async () => {
      db.contact.create.mockResolvedValue({ id: "c1" });

      await createContact({ name: "Dave", createdBy: "attacker" } as any);

      const data = db.contact.create.mock.calls[0][0].data;
      expect(data.createdBy).toBe(user.id);
      expect(data.name).toBe("Dave");
    });

    it("stores empty optional text as null rather than an empty string", async () => {
      db.contact.create.mockResolvedValue({ id: "c1" });

      await createContact({ name: "Dave", email: "", title: "", company: "" } as any);

      const data = db.contact.create.mock.calls[0][0].data;
      expect(data.email).toBeNull();
      expect(data.title).toBeNull();
      expect(data.companyId).toBeNull();
    });
  });

  describe("updateContact", () => {
    it("scopes the update to the owner and reports a miss", async () => {
      db.contact.updateMany.mockResolvedValue({ count: 0 });

      const res = await updateContact({ id: "c1", name: "Dave" } as any);

      expect(db.contact.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "c1", createdBy: user.id } }),
      );
      expect(res.success).toBe(false);
    });
  });

  describe("deleteContactById", () => {
    it("deletes only the caller's contact", async () => {
      db.contact.deleteMany.mockResolvedValue({ count: 1 });

      const res = await deleteContactById("c1");

      expect(db.contact.deleteMany).toHaveBeenCalledWith({
        where: { id: "c1", createdBy: user.id },
      });
      expect(res.success).toBe(true);
    });

    it("reports a delete that matched nothing rather than claiming success", async () => {
      db.contact.deleteMany.mockResolvedValue({ count: 0 });
      const res = await deleteContactById("someone-elses");
      expect(res.success).toBe(false);
    });
  });
});
