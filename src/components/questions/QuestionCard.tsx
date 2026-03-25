"use client";
import { useState } from "react";
import { Question } from "@/models/question.model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useTranslations } from "@/i18n";
import DOMPurify from "dompurify";

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
  const { t } = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasAnswer = question.answer && question.answer.trim().length > 0;
  const isLongAnswer = hasAnswer && question.answer!.length > 300;

  return (
    <>
      <div className="border rounded-lg p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="text-left font-medium hover:underline hover:text-primary cursor-pointer flex-1"
            onClick={() => onEdit(question)}
          >
            {question.question}
          </button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t("questions.edit")}
              onClick={() => onEdit(question)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">{t("questions.edit")}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              aria-label={t("questions.delete")}
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">{t("questions.delete")}</span>
            </Button>
          </div>
        </div>

        {hasAnswer && (
          <div
            className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                expanded || !isLongAnswer
                  ? question.answer!
                  : truncateHtml(question.answer!, 300),
              ),
            }}
          />
        )}

        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {question.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {isLongAnswer && (
          <button
            className="text-xs text-primary mt-2 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t("questions.showLess") : t("questions.showMore")}
          </button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("questions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("questions.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("questions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(question.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("questions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
