import { resolveJobStatus } from "@/lib/jobs/resolve";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    jobStatus: { findUnique: vi.fn(), findMany: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

describe("resolveJobStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to draft when no value is given", async () => {
    (prisma.jobStatus.findUnique as any).mockResolvedValue({ id: "status-draft" });

    const result = await resolveJobStatus(undefined);

    expect(prisma.jobStatus.findUnique).toHaveBeenCalledWith({
      where: { value: "draft" },
    });
    expect(result).toBe("status-draft");
  });

  it("resolves a known status case-insensitively", async () => {
    (prisma.jobStatus.findUnique as any).mockResolvedValue({ id: "status-applied" });

    const result = await resolveJobStatus("APPLIED");

    expect(prisma.jobStatus.findUnique).toHaveBeenCalledWith({
      where: { value: "applied" },
    });
    expect(result).toBe("status-applied");
  });

  it("throws listing valid values when the status is unknown", async () => {
    (prisma.jobStatus.findUnique as any).mockResolvedValue(null);
    (prisma.jobStatus.findMany as any).mockResolvedValue([
      { value: "draft" },
      { value: "applied" },
      { value: "interviewing" },
    ]);

    await expect(resolveJobStatus("bogus")).rejects.toThrow(
      'Invalid status "bogus". Valid values: draft, applied, interviewing',
    );
  });
});
