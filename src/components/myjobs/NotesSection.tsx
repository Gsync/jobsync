"use client";
import { useTranslations } from "@/i18n/use-translations";
import { useCallback, useEffect, useState } from "react";
import { NoteResponse } from "@/models/note.model";
import { getNotesByJobId, deleteNote } from "@/actions/note.actions";
import { NoteCard } from "./NoteCard";
import { NoteDialog } from "./NoteDialog";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ChevronDown, PlusCircle, StickyNote } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { toast } from "../ui/use-toast";

type NotesSectionProps = {
  jobId: string;
};

export function NotesSection({ jobId }: NotesSectionProps) {
  const { t } = useTranslations();
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteResponse | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [noteIdToDelete, setNoteIdToDelete] = useState("");

  const loadNotes = useCallback(async () => {
    const result = await getNotesByJobId(jobId);
    if (result.success) {
      setNotes(result.data);
      if (result.data.length > 0) setIsOpen(true);
    }
  }, [jobId]);

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
    if (result.success) {
      toast({
        variant: "success",
        description: "Note deleted successfully",
      });
      loadNotes();
    } else {
      toast({
        variant: "destructive",
        title: t("jobs.error"),
        description: result.message,
      });
    }
  };

  const handleAddNote = () => {
    setEditNote(null);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setEditNote(null);
    loadNotes();
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mx-4 mb-4">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
            <StickyNote className="h-4 w-4" />
            <span className="font-medium">{t("jobs.notes")}</span>
            {notes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {notes.length}
              </Badge>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={handleAddNote}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {t("jobs.newNote")}
          </Button>
        </div>
        <CollapsibleContent className="mt-3 space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("jobs.noNotes")}</p>
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
        </CollapsibleContent>
      </Collapsible>

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
