import "server-only";
import prisma from "@/lib/db";

export async function getStatusList(): Promise<any | undefined> {
  try {
    const statuses = await prisma.jobStatus.findMany();
    return statuses;
  } catch (error) {
    console.error("Failed to fetch status list:", error);
    throw new Error("Failed to fetch status list.");
  }
}
