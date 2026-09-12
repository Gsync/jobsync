import {
  getJobContacts,
  addJobContact,
  removeJobContact,
} from "@/actions/contact.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    jobContact: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    job: { count: vi.fn() },
    contact: { count: vi.fn() },
    contactRole: { count: vi.fn() },
  },
}));

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

describe("job contact links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
    db.job.count.mockResolvedValue(1);
    db.contact.count.mockResolvedValue(1);
    db.contactRole.count.mockResolvedValue(1);
  });

  it("reads links through the job's ownership chain", async () => {
    db.jobContact.findMany.mockResolvedValue([]);

    await getJobContacts("j1");

    expect(db.jobContact.findMany.mock.calls[0][0].where).toEqual({
      jobId: "j1",
      Job: { userId: user.id },
    });
  });

  it("refuses to link a contact the caller does not own", async () => {
    db.contact.count.mockResolvedValue(0);

    const res = await addJobContact("j1", "someone-elses-contact", "r1");

    expect(res.success).toBe(false);
    expect(db.jobContact.create).not.toHaveBeenCalled();
  });

  it("refuses to link to a job the caller does not own", async () => {
    db.job.count.mockResolvedValue(0);

    const res = await addJobContact("someone-elses-job", "c1", "r1");

    expect(res.success).toBe(false);
    expect(db.jobContact.create).not.toHaveBeenCalled();
  });

  it("refuses a role the caller does not own", async () => {
    db.contactRole.count.mockResolvedValue(0);

    const res = await addJobContact("j1", "c1", "someone-elses-role");

    expect(res.success).toBe(false);
    expect(db.jobContact.create).not.toHaveBeenCalled();
  });

  it("creates the link when all three belong to the caller", async () => {
    db.jobContact.create.mockResolvedValue({ id: "jc1" });

    const res = await addJobContact("j1", "c1", "r1");

    expect(res.success).toBe(true);
    expect(db.jobContact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { jobId: "j1", contactId: "c1", roleId: "r1" },
      }),
    );
  });

  it("reports a duplicate link as a message, not a crash", async () => {
    db.jobContact.create.mockRejectedValue({ code: "P2002" });

    const res = await addJobContact("j1", "c1", "r1");

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/already/i);
  });

  it("removes a link only through both ownership chains", async () => {
    db.jobContact.deleteMany.mockResolvedValue({ count: 1 });

    const res = await removeJobContact("jc1");

    expect(db.jobContact.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "jc1",
        Job: { userId: user.id },
        Contact: { createdBy: user.id },
      },
    });
    expect(res.success).toBe(true);
  });

  it("reports a removal that matched nothing", async () => {
    db.jobContact.deleteMany.mockResolvedValue({ count: 0 });
    const res = await removeJobContact("jc1");
    expect(res.success).toBe(false);
  });
});
