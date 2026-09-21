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
    company: { count: vi.fn() },
    location: { count: vi.fn() },
    contactRole: { count: vi.fn() },
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
    db.company.count.mockResolvedValue(1);
    db.location.count.mockResolvedValue(1);
    db.contactRole.count.mockResolvedValue(1);
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
        { id: "c1", name: "Dave Patel", title: "CTO", email: "dave@x.com", Company: { label: "Shopify" } },
      ]);

      const res = await getAllContacts();

      expect(res).toEqual([
        {
          id: "c1",
          label: "Dave Patel",
          title: "CTO",
          company: "Shopify",
          value: "dave patel dave@x.com shopify",
        },
      ]);
    });

    // The Link Interviewers dialog shows "<title> · <company>" beneath the
    // name, which the search blob alone cannot be taken apart into.
    it("carries the title and company as their own fields", async () => {
      db.contact.findMany.mockResolvedValue([
        { id: "c2", name: "Priya Nair", title: null, email: null, Company: null },
      ]);

      const res = await getAllContacts();

      expect(res[0].title).toBeNull();
      expect(res[0].company).toBeNull();
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

  describe("reference ownership", () => {
    const values = {
      name: "Dave",
      company: "co-1",
      workedAtCompany: "co-2",
      location: "loc-1",
      contactRole: "role-1",
    } as any;

    it("counts each referenced id against the caller", async () => {
      db.company.count.mockResolvedValue(2);
      db.contact.create.mockResolvedValue({ id: "c1" });

      const res = await createContact(values);

      expect(res.success).toBe(true);
      expect(db.company.count).toHaveBeenCalledWith({
        where: { id: { in: ["co-1", "co-2"] }, createdBy: user.id },
      });
      expect(db.location.count).toHaveBeenCalledWith({
        where: { id: "loc-1", createdBy: user.id },
      });
      expect(db.contactRole.count).toHaveBeenCalledWith({
        where: { id: "role-1", createdBy: user.id },
      });
    });

    it("counts a company used for both fields once", async () => {
      db.contact.create.mockResolvedValue({ id: "c1" });

      const res = await createContact({ ...values, workedAtCompany: "co-1" });

      expect(res.success).toBe(true);
      expect(db.company.count.mock.calls[0][0].where.id).toEqual({
        in: ["co-1"],
      });
    });

    it.each([
      ["company", "company", 1, "Company not found"],
      ["location", "location", 0, "Location not found"],
      ["role", "contactRole", 0, "Role not found"],
    ])(
      "create rejects another user's %s",
      async (_label, model, count, message) => {
        db.company.count.mockResolvedValue(2);
        db[model].count.mockResolvedValue(count);

        const res = await createContact(values);

        expect(res).toEqual({ success: false, message });
        expect(db.contact.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ["company", "company", 1, "Company not found"],
      ["location", "location", 0, "Location not found"],
      ["role", "contactRole", 0, "Role not found"],
    ])(
      "update rejects another user's %s before writing",
      async (_label, model, count, message) => {
        db.company.count.mockResolvedValue(2);
        db[model].count.mockResolvedValue(count);

        const res = await updateContact({ ...values, id: "c1" });

        expect(res).toEqual({ success: false, message });
        expect(db.contact.updateMany).not.toHaveBeenCalled();
      },
    );
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
