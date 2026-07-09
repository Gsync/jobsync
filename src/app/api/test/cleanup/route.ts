import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteResumeById } from "@/actions/profile.actions";

// Test-only endpoint used by e2e fixtures to tear down what a test created:
// job and resume rows, plus the Library items (job titles / companies /
// locations) their comboboxes persist independently. Disabled in production
// so it can never delete real data.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const {
    jobIds = [],
    resumes = [],
    tasks = [],
    titles = [],
    companies = [],
    locations = [],
    activityTypes = [],
  }: {
    jobIds?: string[];
    resumes?: string[];
    tasks?: string[];
    titles?: string[];
    companies?: string[];
    locations?: string[];
    activityTypes?: string[];
  } = await req.json();

  // Delete jobs, resumes and tasks first (they/their sections reference the
  // Library items), so those items become unused and eligible for deletion.
  for (const id of jobIds) {
    await prisma.job.deleteMany({ where: { id, userId } });
  }
  for (const title of resumes) {
    const rows = await prisma.resume.findMany({
      where: { title, profile: { userId } },
      select: { id: true },
    });
    // deleteResumeById cascades contact info / summary / experience /
    // education / sections within a transaction.
    for (const { id } of rows) {
      await deleteResumeById(id);
    }
  }
  for (const title of tasks) {
    const rows = await prisma.task.findMany({
      where: { title, userId },
      select: { id: true },
    });
    for (const { id } of rows) {
      // A task can't be deleted while an activity references it.
      await prisma.activity.deleteMany({ where: { taskId: id, userId } });
      await prisma.task.deleteMany({ where: { id, userId } });
    }
  }

  // Sources are never created by the tests (they select the seeded "Indeed"),
  // so they are intentionally not cleaned up here.
  await deleteLibraryByName("jobTitle", titles, userId);
  await deleteLibraryByName("company", companies, userId);
  await deleteLibraryByName("location", locations, userId);
  await deleteLibraryByName("activityType", activityTypes, userId);

  return NextResponse.json({ success: true });
}

type RefModel = "jobTitle" | "company" | "location" | "activityType";

// Count every place a Library row can still be referenced from, so we never
// delete one that another job or resume section still uses.
async function referenceCount(
  model: RefModel,
  refId: string,
): Promise<number> {
  if (model === "jobTitle") {
    return (
      (await prisma.job.count({ where: { jobTitleId: refId } })) +
      (await prisma.workExperience.count({ where: { jobTitleId: refId } }))
    );
  }
  if (model === "company") {
    return (
      (await prisma.job.count({ where: { companyId: refId } })) +
      (await prisma.workExperience.count({ where: { companyId: refId } }))
    );
  }
  if (model === "activityType") {
    return (
      (await prisma.activity.count({ where: { activityTypeId: refId } })) +
      (await prisma.task.count({ where: { activityTypeId: refId } }))
    );
  }
  return (
    (await prisma.job.count({ where: { locationId: refId } })) +
    (await prisma.workExperience.count({ where: { locationId: refId } })) +
    (await prisma.education.count({ where: { locationId: refId } }))
  );
}

// Delete each named Library row (matched the same way the create actions store
// it: value = label.trim().toLowerCase()), scoped to the user and only when
// nothing references it anymore.
async function deleteLibraryByName(
  model: RefModel,
  names: string[],
  userId: string,
) {
  for (const name of names) {
    const value = name.trim().toLowerCase();
    if (!value) continue;
    const row = await (prisma[model] as any).findFirst({
      where: { value, createdBy: userId },
      select: { id: true },
    });
    if (!row) continue;
    if ((await referenceCount(model, row.id)) > 0) continue;
    await (prisma[model] as any).delete({ where: { id: row.id } });
  }
}
