"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { NoteResponse } from "@/models/note.model";
import { getNotesByJobId, deleteNote } from "@/actions/note.actions";
import { NoteCard } from "./NoteCard";
import { NoteDialog } from "./NoteDialog";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { toastActionResult } from "@/lib/toast";

type NotesSectionProps = {
  jobId: string;
  openTrigger?: number;
  onCountChange?: (count: number) => void;
};

export function NotesSection({
  jobId,
  openTrigger,
  onCountChange,
}: NotesSectionProps) {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteResponse | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [noteIdToDelete, setNoteIdToDelete] = useState("");

  const loadNotes = useCallback(async () => {
    const result = await getNotesByJobId(jobId);
    if (result.success) {
      setNotes(result.data);
      onCountChange?.(result.data.length);
    }
  }, [jobId, onCountChange]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleEdit = (note: NoteResponse) => {
    setEditNote(note);
    setDialogOpen(true);
  };

  const handleDeleteClick = (noteId: string) => {
    setNoteIdToDelete(noteId);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    const result = await deleteNote(noteIdToDelete);
    toastActionResult(result, {
      success: "Note deleted successfully",
      onSuccess: () => loadNotes(),
    });
  };

  const handleAddNote = () => {
    setEditNote(null);
    setDialogOpen(true);
  };

  const lastOpenTrigger = useRef(openTrigger);
  useEffect(() => {
    if (openTrigger === undefined || openTrigger === lastOpenTrigger.current) {
      return;
    }
    lastOpenTrigger.current = openTrigger;
    handleAddNote();
  }, [openTrigger]);

  const handleSaved = () => {
    setEditNote(null);
    loadNotes();
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {notes.length === 0
              ? "Notes"
              : notes.length === 1
                ? "1 note on this job"
                : `${notes.length} notes on this job`}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={handleAddNote}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Note
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))
          )}
        </div>
      </div>

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobId={jobId}
        editNote={editNote}
        onSaved={handleSaved}
      />
      <DeleteAlertDialog
        pageTitle="note"
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onDelete={handleDelete}
      />
    </>
  );
}
