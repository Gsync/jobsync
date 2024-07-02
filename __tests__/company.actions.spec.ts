import { getCompanyList } from "@/actions/company.actions"; // Adjust the import path as needed
import { getCurrentUser } from "@/utils/user.utils";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Mock the Prisma Client
jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    company: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

describe("getCompanyList", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return company list for authenticated user", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    const mockData = [
      {
        id: "company-id",
        label: "Company 1",
        value: "company1",
        logoUrl: "logo.png",
      },
    ];
    const mockTotal = 1;

    (prisma.company.findMany as jest.Mock).mockResolvedValue(mockData);
    (prisma.company.count as jest.Mock).mockResolvedValue(mockTotal);

    const result = await getCompanyList(1, 10);

    expect(result).toEqual({ data: mockData, total: mockTotal });
    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { createdBy: mockUser.id },
      skip: 0,
      take: 10,
      orderBy: { jobsApplied: { _count: "desc" } },
    });
    expect(prisma.company.count).toHaveBeenCalledWith({
      where: { createdBy: mockUser.id },
    });
  });

  it("should throw an error for unauthenticated user", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await expect(getCompanyList(1, 10)).rejects.toThrow(
      "Failed to fetch company list. "
    );

    expect(prisma.company.findMany).not.toHaveBeenCalled();
    expect(prisma.company.count).not.toHaveBeenCalled();
  });

  it("should filter by status when countBy is provided", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    const mockData = [
      {
        id: "company-id",
        label: "Company 1",
        value: "company1",
        logoUrl: "logo.png",
      },
    ];
    const mockTotal = 1;

    (prisma.company.findMany as jest.Mock).mockResolvedValue(mockData);
    (prisma.company.count as jest.Mock).mockResolvedValue(mockTotal);

    const result = await getCompanyList(1, 10, "applied");

    expect(result).toEqual({ data: mockData, total: mockTotal });
    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { createdBy: mockUser.id },
      skip: 0,
      take: 10,
      select: {
        id: true,
        label: true,
        value: true,
        logoUrl: true,
        _count: {
          select: {
            jobsApplied: {
              where: {
                Status: {
                  value: "applied",
                },
              },
            },
          },
        },
      },
      orderBy: { jobsApplied: { _count: "desc" } },
    });
    expect(prisma.company.count).toHaveBeenCalledWith({
      where: { createdBy: mockUser.id },
    });
  });

  it("should handle errors", async () => {
    (getCurrentUser as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    await expect(getCompanyList(1, 10)).rejects.toThrow(
      "Failed to fetch company list. "
    );

    expect(prisma.company.findMany).not.toHaveBeenCalled();
    expect(prisma.company.count).not.toHaveBeenCalled();
  });
});
