import prisma from "@/lib/db";

// @ts-expect-error - no types for bcryptjs
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

const JOB_SOURCES = [
  { label: "Indeed", value: "indeed" },
  { label: "Linkedin", value: "linkedin" },
  { label: "Monster", value: "monster" },
  { label: "Glassdoor", value: "glassdoor" },
  { label: "Company Career page", value: "careerpage" },
  { label: "Google", value: "google" },
  { label: "ZipRecruiter", value: "ziprecruiter" },
  { label: "Job Street", value: "jobstreet" },
  { label: "Other", value: "other" },
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
  for (const status of STATUS_DATA) {
    const existing = await prisma.jobStatus.findUnique({
      where: { value: status.value },
    });
    if (!existing) {
      await prisma.jobStatus.create({ data: status });
    }
  }
  console.log("[seed] Statuses ready");
}

async function seedJobSources(userId: string) {
  for (const source of JOB_SOURCES) {
    await prisma.jobSource.upsert({
      where: { value: source.value },
      update: { label: source.label, value: source.value },
      create: { label: source.label, value: source.value, createdBy: userId },
    });
  }
  console.log("[seed] Job sources ready");
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
