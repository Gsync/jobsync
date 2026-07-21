"use client";
import { useState } from "react";
import { Question } from "@/models/question.model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionTagBadge } from "@/components/questions/QuestionTagBadge";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";

type QuestionCardProps = {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
};

function truncateHtml(html: string, maxLength: number): string {
  if (html.length <= maxLength) return html;
  return html.substring(0, maxLength) + "...";
}

export function QuestionCard({
  question,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasAnswer = question.answer && question.answer.trim().length > 0;
  const isLongAnswer = hasAnswer && question.answer!.length > 300;

  return (
    <>
      <div
        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid="question-card"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium flex-1">{question.question}</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(question);
              }}
              data-testid="question-edit-btn"
            >
              <Pencil className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              data-testid="question-delete-btn"
            >
              <Trash2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {hasAnswer && (
          <div className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
            <TipTapContentViewer
              content={
                expanded || !isLongAnswer
                  ? question.answer!
                  : truncateHtml(question.answer!, 300)
              }
            />
          </div>
        )}

        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {question.tags.map((tag) => (
              <QuestionTagBadge key={tag.id}>{tag.label}</QuestionTagBadge>
            ))}
          </div>
        )}

        {question.createdVia && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              via {question.createdVia}
            </Badge>
          </div>
        )}

        {isLongAnswer && (
          <button
            className="text-xs text-primary mt-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(question.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
