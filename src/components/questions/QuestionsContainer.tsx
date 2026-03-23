"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "../ui/input";
import {
  deleteQuestion,
  getQuestionById,
  getQuestionsList,
} from "@/actions/question.actions";
import { toast } from "../ui/use-toast";
import { Question } from "@/models/question.model";
import { Tag } from "@/models/job.model";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { QuestionList } from "./QuestionList";
import { QuestionForm } from "./QuestionForm";
import { useTranslations } from "@/i18n";

type QuestionsContainerProps = {
  availableTags: Tag[];
  filterKey?: string;
  onQuestionsChanged?: () => void;
};

function QuestionsContainer({
  availableTags,
  filterKey,
  onQuestionsChanged,
}: QuestionsContainerProps) {
  const { t } = useTranslations();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE
  );
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);

  const loadQuestions = useCallback(
    async (pageNum: number, filter?: string, search?: string) => {
      setLoading(true);
      const result = await getQuestionsList(
        pageNum,
        recordsPerPage,
        filter,
        search
      );
      if (result?.success && result.data) {
        setQuestions((prev) =>
          pageNum === 1 ? result.data : [...prev, ...result.data]
        );
        setTotalQuestions(result.total);
        setPage(pageNum);
      } else {
        toast({
          variant: "destructive",
          title: t("questions.error"),
          description: result?.message || t("questions.loadFailed"),
        });
      }
      setLoading(false);
    },
    [recordsPerPage]
  );

  const reloadQuestions = useCallback(async () => {
    await loadQuestions(1, filterKey, searchTerm || undefined);
    onQuestionsChanged?.();
  }, [loadQuestions, filterKey, searchTerm, onQuestionsChanged]);

  const onDeleteQuestion = async (questionId: string) => {
    const { success, message } = await deleteQuestion(questionId);
    if (success) {
      toast({
        variant: "success",
        description: t("questions.deletedSuccess"),
      });
      reloadQuestions();
    } else {
      toast({
        variant: "destructive",
        title: t("questions.error"),
        description: message,
      });
    }
  };

  const onEditQuestion = async (question: Question) => {
    const { data, success, message } = await getQuestionById(question.id);
    if (!success) {
      toast({
        variant: "destructive",
        title: t("questions.error"),
        description: message,
      });
      return;
    }
    setEditQuestion(data);
    setDialogOpen(true);
  };

  const addQuestionForm = () => {
    setEditQuestion(null);
    setDialogOpen(true);
  };

  useEffect(() => {
    loadQuestions(1, filterKey, searchTerm || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadQuestions, filterKey, recordsPerPage]);

  // Debounced search
  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadQuestions(1, filterKey, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>{t("questions.title")}</CardTitle>
          <div className="flex items-center">
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("questions.searchPlaceholder")}
                  className="pl-8 h-8 w-[150px] lg:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={addQuestionForm}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {t("questions.newQuestion")}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <Loading />}
          {!loading && (
            <>
              <QuestionList
                questions={questions}
                onEdit={onEditQuestion}
                onDelete={onDeleteQuestion}
              />
              {questions.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <RecordsCount
                    count={questions.length}
                    total={totalQuestions}
                    label={t("questions.questionsLabel")}
                  />
                  {totalQuestions > APP_CONSTANTS.RECORDS_PER_PAGE && (
                    <RecordsPerPageSelector
                      value={recordsPerPage}
                      onChange={setRecordsPerPage}
                    />
                  )}
                </div>
              )}
            </>
          )}
          {!loading && questions.length < totalQuestions && (
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  loadQuestions(
                    page + 1,
                    filterKey,
                    searchTerm || undefined
                  )
                }
                disabled={loading}
              >
                {t("questions.loadMore")}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      <QuestionForm
        availableTags={availableTags}
        editQuestion={editQuestion}
        resetEditQuestion={() => setEditQuestion(null)}
        onQuestionSaved={reloadQuestions}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
      />
    </>
  );
}

export default QuestionsContainer;
