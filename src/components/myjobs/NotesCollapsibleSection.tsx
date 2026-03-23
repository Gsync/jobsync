"use client";
import { useTranslations } from "@/i18n";
import { useCallback, useEffect, useState, useTransition } from "react";
import { NoteResponse } from "@/models/note.model";
import {
  getNotesByJobId,
  deleteNote,
  addNote,
  updateNote,
} from "@/actions/note.actions";
import { NoteCard } from "./NoteCard";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ChevronDown, Loader, PlusCircle, StickyNote } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { toast } from "../ui/use-toast";
import TiptapEditor from "../TiptapEditor";

type NotesCollapsibleSectionProps = {
  jobId: string;
};

export function NotesCollapsibleSection({
  jobId,
}: NotesCollapsibleSectionProps) {
  const { t } = useTranslations();
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteResponse | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadNotes = useCallback(async () => {
    const result = await getNotesByJobId(jobId);
    if (result.success) {
      setNotes(result.data);
    }
  }, [jobId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = () => {
    setEditingNote(null);
    setEditorContent("");
    setIsAdding(true);
    setIsOpen(true);
  };

  const handleEdit = (note: NoteResponse) => {
    setIsAdding(false);
    setEditingNote(note);
    setEditorContent(note.content);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingNote(null);
    setEditorContent("");
  };

  const handleSave = () => {
    if (!editorContent.trim()) return;

    startTransition(async () => {
      const result = editingNote
        ? await updateNote({
            id: editingNote.id,
            jobId,
            content: editorContent,
          })
        : await addNote({ jobId, content: editorContent });

      if (result.success) {
        toast({
          variant: "success",
          description: editingNote ? t("jobs.noteUpdated") : t("jobs.noteAdded"),
        });
        handleCancel();
        loadNotes();
      } else {
        toast({
          variant: "destructive",
          title: t("jobs.error"),
          description: result.message,
        });
      }
    });
  };

  const handleDeleteClick = (noteId: string) => {
    setDeleteConfirmId(noteId);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;

    startTransition(async () => {
      const result = await deleteNote(deleteConfirmId);
      if (result.success) {
        toast({
          variant: "success",
          description: "Note deleted successfully",
        });
        setDeleteConfirmId(null);
        loadNotes();
      } else {
        toast({
          variant: "destructive",
          title: t("jobs.error"),
          description: result.message,
        });
      }
    });
  };

  const inlineEditor = (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">
        {editingNote ? t("jobs.editNote") : t("jobs.addNoteTitle")}
      </p>
      <TiptapEditor
        field={
          {
            value: editorContent,
            onChange: (val: string) => setEditorContent(val),
            onBlur: () => {},
            name: "content" as const,
            ref: () => {},
          } as any
        }
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending || !editorContent.trim()}
        >
          {t("common.save")}
          {isPending && <Loader className="ml-2 h-4 w-4 shrink-0 spinner" />}
        </Button>
      </div>
    </div>
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="md:col-span-2"
    >
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
          <StickyNote className="h-4 w-4" />
          <span className="text-sm font-medium">{t("jobs.notes")}</span>
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
          type="button"
          className="h-7 gap-1 ml-auto"
          onClick={handleAddNote}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {t("jobs.newNote")}
        </Button>
      </div>
      <CollapsibleContent className="mt-3 space-y-3">
        {isAdding && inlineEditor}
        {notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground">{t("jobs.noNotes")}</p>
        ) : (
          notes.map((note) =>
            editingNote?.id === note.id ? (
              <div key={note.id}>{inlineEditor}</div>
            ) : deleteConfirmId === note.id ? (
              <div
                key={note.id}
                className="border border-destructive rounded-lg p-4 space-y-3"
              >
                <p className="text-sm font-medium">
                  {t("jobs.deleteNoteConfirm")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("jobs.deleteNoteWarning")}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteConfirm}
                    disabled={isPending}
                  >
                    {t("common.delete")}
                    {isPending && (
                      <Loader className="ml-2 h-4 w-4 shrink-0 spinner" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ),
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
