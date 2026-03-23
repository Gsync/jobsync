"use client";
import { useState } from "react";
import { Question } from "@/models/question.model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <div
        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium flex-1">{question.question}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(question);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("questions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("questions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasAnswer && (
          <div
            className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html:
                expanded || !isLongAnswer
                  ? question.answer!
                  : truncateHtml(question.answer!, 300),
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
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
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
