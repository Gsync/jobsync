"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { NoteFormSchema } from "@/models/note.schema";
import { NoteResponse } from "@/models/note.model";
import { getCurrentUser } from "@/utils/user.utils";
import { z } from "zod";

export const getNotesByJobId = async (
  jobId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: user.id },
      select: { id: true },
    });
    if (!job) {
      throw new Error("Job not found");
    }

    const notes = await prisma.note.findMany({
      where: { jobId, userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const data: NoteResponse[] = notes.map((note) => ({
      ...note,
      isEdited: note.updatedAt.getTime() - note.createdAt.getTime() > 1000,
    }));

    return { success: true, data };
  } catch (error) {
    const msg = "Failed to fetch notes.";
    return handleError(error, msg);
  }
};

export const addNote = async (
  data: z.infer<typeof NoteFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const validated = NoteFormSchema.parse(data);

    const job = await prisma.job.findFirst({
      where: { id: validated.jobId, userId: user.id },
      select: { id: true },
    });
    if (!job) {
      throw new Error("Job not found");
    }

    const note = await prisma.note.create({
      data: {
        jobId: validated.jobId,
        userId: user.id,
        content: validated.content,
      },
    });

    return { success: true, data: note };
  } catch (error) {
    const msg = "Failed to add note.";
    return handleError(error, msg);
  }
};

export const updateNote = async (
  data: z.infer<typeof NoteFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const validated = NoteFormSchema.parse(data);
    if (!validated.id) {
      throw new Error("Note ID is required for update");
    }

    const note = await prisma.note.update({
      where: { id: validated.id, userId: user.id },
      data: { content: validated.content },
    });

    return { success: true, data: note };
  } catch (error) {
    const msg = "Failed to update note.";
    return handleError(error, msg);
  }
};

export const deleteNote = async (
  noteId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    await prisma.note.delete({
      where: { id: noteId, userId: user.id },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to delete note.";
    return handleError(error, msg);
  }
};
