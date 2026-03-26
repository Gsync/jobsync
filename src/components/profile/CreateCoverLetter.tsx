"use client";
import { Loader } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { CoverLetterFormSchema } from "@/models/coverLetterForm.schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { CoverLetter } from "@/models/profile.model";
import { toast } from "../ui/use-toast";
import {
  createCoverLetter,
  updateCoverLetter,
} from "@/actions/coverLetter.actions";
import Tiptap from "../TiptapEditor";

type CreateCoverLetterProps = {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  coverLetterToEdit?: CoverLetter | null;
  reloadDocuments: () => void;
};

function CreateCoverLetter({
  dialogOpen,
  setDialogOpen,
  coverLetterToEdit,
  reloadDocuments,
}: CreateCoverLetterProps) {
  const [isPending, startTransition] = useTransition();

  const pageTitle = coverLetterToEdit
    ? "Edit Cover Letter"
    : "Create Cover Letter";

  const form = useForm<z.infer<typeof CoverLetterFormSchema>>({
    resolver: zodResolver(CoverLetterFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const {
    reset,
    formState: { errors, isValid },
  } = form;

  const closeDialog = () => setDialogOpen(false);

  useEffect(() => {
    reset({
      id: coverLetterToEdit?.id ?? undefined,
      title: coverLetterToEdit?.title ?? "",
      content: coverLetterToEdit?.content ?? "",
    });
  }, [coverLetterToEdit, reset]);

  const onSubmit = (data: z.infer<typeof CoverLetterFormSchema>) => {
    startTransition(async () => {
      const { success, message } = coverLetterToEdit?.id
        ? await updateCoverLetter(data.id!, data.title, data.content)
        : await createCoverLetter(data.title, data.content);

      if (!success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      } else {
        reset();
        setDialogOpen(false);
        reloadDocuments();
        toast({
          variant: "success",
          description: `Cover letter has been ${
            coverLetterToEdit ? "updated" : "created"
          } successfully`,
        });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="lg:max-w-screen-md lg:max-h-screen overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.stopPropagation();
              form.handleSubmit(onSubmit)(event);
            }}
            className="grid grid-cols-1 gap-4 p-2"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Letter Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Software Engineer - Google"
                    />
                  </FormControl>
                  <FormMessage>
                    {errors.title && (
                      <span className="text-red-500">
                        {errors.title.message}
                      </span>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              key={coverLetterToEdit?.id ?? "new"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Tiptap field={field} />
                  </FormControl>
                  <FormMessage>
                    {errors.content && (
                      <span className="text-red-500">
                        {errors.content.message}
                      </span>
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />

            <div className="mt-4">
              <DialogFooter>
                <div>
                  <Button
                    type="reset"
                    variant="outline"
                    className="mt-2 md:mt-0 w-full"
                    onClick={closeDialog}
                  >
                    Cancel
                  </Button>
                </div>
                <Button type="submit" disabled={!isValid}>
                  Save
                  {isPending && (
                    <Loader className="h-4 w-4 shrink-0 spinner" />
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCoverLetter;
