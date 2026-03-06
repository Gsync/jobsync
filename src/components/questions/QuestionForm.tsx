"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createQuestion, updateQuestion } from "@/actions/question.actions";
import { Loader } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { useEffect, useTransition } from "react";
import { AddQuestionFormSchema } from "@/models/addQuestionForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Question } from "@/models/question.model";
import { Tag } from "@/models/job.model";
import { z } from "zod";
import { toast } from "../ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import TiptapEditor from "../TiptapEditor";
import { TagInput } from "../myjobs/TagInput";

type QuestionFormProps = {
  availableTags: Tag[];
  editQuestion?: Question | null;
  resetEditQuestion: () => void;
  onQuestionSaved: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
};

export function QuestionForm({
  availableTags,
  editQuestion,
  resetEditQuestion,
  onQuestionSaved,
  dialogOpen,
  setDialogOpen,
}: QuestionFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof AddQuestionFormSchema>>({
    resolver: zodResolver(AddQuestionFormSchema),
    defaultValues: {
      question: "",
      answer: "",
      tagIds: [],
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (editQuestion) {
      reset({
        id: editQuestion.id,
        question: editQuestion.question,
        answer: editQuestion.answer || "",
        tagIds: editQuestion.tags?.map((t) => t.id) || [],
      });
    } else {
      reset({
        question: "",
        answer: "",
        tagIds: [],
      });
    }
  }, [editQuestion, reset]);

  function onSubmit(data: z.infer<typeof AddQuestionFormSchema>) {
    startTransition(async () => {
      const { success, message } = editQuestion
        ? await updateQuestion(data)
        : await createQuestion(data);

      if (success) {
        toast({
          variant: "success",
          description: `Question has been ${editQuestion ? "updated" : "created"} successfully`,
        });
        reset();
        setDialogOpen(false);
        resetEditQuestion();
        onQuestionSaved();
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
    });
  }

  const pageTitle = editQuestion ? "Edit Question" : "Add Question";

  const closeDialog = () => {
    reset();
    resetEditQuestion();
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogOverlay>
        <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pageTitle}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 gap-4 p-4"
            >
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Question *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter interview question" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Skill Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        availableTags={availableTags}
                        selectedTagIds={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <TiptapEditor field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="reset"
                  variant="outline"
                  className="mt-2 md:mt-0"
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                  {isPending && (
                    <Loader className="h-4 w-4 shrink-0 spinner ml-2" />
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
}
