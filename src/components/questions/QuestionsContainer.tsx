"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { SearchInput } from "../SearchInput";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import {
  deleteQuestion,
  getQuestionById,
  getQuestionsList,
} from "@/actions/question.actions";
import { toastActionResult, toastError } from "@/lib/toast";
import { Question } from "@/models/question.model";
import { Tag } from "@/models/job.model";
import { RecordsCount } from "../RecordsCount";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { QuestionList } from "./QuestionList";
import { QuestionForm } from "./QuestionForm";

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);

  const loadQuestions = useCallback(
    async (pageNum: number, filter?: string, search?: string) => {
      setLoading(true);
      const result = await getQuestionsList(
        pageNum,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        filter,
        search,
      );
      if (result?.success && result.data) {
        setQuestions((prev) =>
          pageNum === 1 ? result.data : [...prev, ...result.data],
        );
        setTotalQuestions(result.total);
        setPage(pageNum);
      } else {
        toastError(result?.message || "Failed to load questions.");
      }
      setLoading(false);
    },
    [],
  );

  const reloadQuestions = useCallback(async () => {
    await loadQuestions(1, filterKey, searchTerm || undefined);
    onQuestionsChanged?.();
  }, [loadQuestions, filterKey, searchTerm, onQuestionsChanged]);

  const onDeleteQuestion = async (questionId: string) => {
    const result = await deleteQuestion(questionId);
    toastActionResult(result, {
      success: "Question has been deleted successfully",
      onSuccess: () => reloadQuestions(),
    });
  };

  const onEditQuestion = async (question: Question) => {
    const { data, success, message } = await getQuestionById(question.id);
    if (!success) {
      toastError(message);
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
  }, [loadQuestions, filterKey]);

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
        <ResponsiveCardHeader>
          <div className="flex items-baseline gap-2">
            <CardTitle>Questions</CardTitle>
            {!loading && totalQuestions > 0 && (
              <RecordsCount
                count={questions.length}
                total={totalQuestions}
                label="questions"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search questions..."
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={addQuestionForm}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                New Question
              </span>
            </Button>
          </div>
        </ResponsiveCardHeader>
        <CardContent>
          {loading && <Loading />}
          {!loading && (
            <>
              <QuestionList
                questions={questions}
                onEdit={onEditQuestion}
                onDelete={onDeleteQuestion}
              />
            </>
          )}
          {!loading && questions.length < totalQuestions && (
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  loadQuestions(page + 1, filterKey, searchTerm || undefined)
                }
                disabled={loading}
              >
                Load More
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
