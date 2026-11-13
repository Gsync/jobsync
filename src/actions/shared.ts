import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";

// Not a "use server" module: shared across the action directories, so it must
// stay importable without becoming a callable server-action endpoint.

export const requireUser = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

// A foreign key proves a tag exists, not that the caller owns it
export const assertTagsOwned = async (tagIds: string[], userId: string) => {
  const ids = [...new Set(tagIds)];
  if (ids.length === 0) return;
  const owned = await prisma.tag.count({
    where: { id: { in: ids }, createdBy: userId },
  });
  if (owned !== ids.length) throw new Error("Tag not found");
};
