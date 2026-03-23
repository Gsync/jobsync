"use client";
import { Question } from "@/models/question.model";
import { QuestionCard } from "./QuestionCard";
import { useTranslations } from "@/i18n";

type QuestionListProps = {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
};

export function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
  const { t } = useTranslations();
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("questions.noQuestions")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
