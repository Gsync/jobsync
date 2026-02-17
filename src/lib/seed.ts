import prisma from "@/lib/db";
import { JOB_SOURCES } from "@/lib/constants";

import bcrypt from "bcryptjs";

const STATUS_DATA = [
  { label: "Draft", value: "draft" },
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
  { label: "Archived", value: "archived" },
];

async function seedUser() {
  const email = process.env.USER_EMAIL;
  if (!email || email.trim() === "") {
    console.warn(
      "[seed] USER_EMAIL not set, skipping user creation"
    );
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    const password = await bcrypt.hash(process.env.USER_PASSWORD || "", 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: "Admin",
        password,
      },
    });
    console.log("[seed] Created user:", email);
    return user;
  }
  return existingUser;
}

async function seedStatuses() {
  const existing = await prisma.jobStatus.findUnique({
    where: { value: "draft" },
  });
  if (existing) return;

  for (const status of STATUS_DATA) {
    await prisma.jobStatus.upsert({
      where: { value: status.value },
      update: {},
      create: status,
    });
  }
  console.log("[seed] Statuses seeded");
}

async function seedJobSources(userId: string) {
  const existing = await prisma.jobSource.findFirst({
    where: { value: "indeed", createdBy: userId },
  });
  if (existing) return;

  for (const source of JOB_SOURCES) {
    const found = await prisma.jobSource.findFirst({
      where: { value: source.value, createdBy: userId },
    });
    if (!found) {
      await prisma.jobSource.create({
        data: { label: source.label, value: source.value, createdBy: userId },
      });
    }
  }
  console.log("[seed] Job sources seeded");
}

export async function runSeed() {
  try {
    const user = await seedUser();
    await seedStatuses();
    if (user) {
      await seedJobSources(user.id);
    }
    console.log("[seed] Database seeding complete");
  } catch (error) {
    console.error("[seed] Error during seeding:", error);
  }
}
