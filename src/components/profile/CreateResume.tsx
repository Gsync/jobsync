"use client";
import { Loader } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import {
  Dialog,
  DialogClose,
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
import { Resume } from "@/models/profile.model";
import { toast } from "../ui/use-toast";
import { createResumeProfile, editResume } from "@/actions/profile.actions";

type CreateResumeProps = {
  resumeDialogOpen: boolean;
  setResumeDialogOpen: (e: boolean) => void;
  resumeToEdit?: Resume | null;
  reloadResumes: () => void;
};

function CreateResume({
  resumeDialogOpen,
  setResumeDialogOpen,
  resumeToEdit,
  reloadResumes,
}: CreateResumeProps) {
  const [isPending, startTransition] = useTransition();

  const pageTitle = resumeToEdit ? "Edit Resume Title" : "Create Resume";

  const form = useForm<z.infer<typeof CreateResumeFormSchema>>({
    resolver: zodResolver(CreateResumeFormSchema),
  });

  const { reset, formState } = form;

  useEffect(() => {
    if (resumeToEdit) {
      reset(
        {
          id: resumeToEdit.id,
          title: resumeToEdit.title,
        },
        { keepDefaultValues: true }
      );
    } else {
      reset();
    }
  }, [resumeToEdit, reset]);

  const onSubmit = (data: z.infer<typeof CreateResumeFormSchema>) => {
    startTransition(async () => {
      const res = resumeToEdit
        ? await editResume(data)
        : await createResumeProfile(data);
      if (!res.success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: res.message,
        });
      } else {
        reset();
        setResumeDialogOpen(false);
        reloadResumes();
        toast({
          variant: "success",
          description: `Resume title has been ${
            resumeToEdit ? "updated" : "created"
          } successfully`,
        });
      }
    });
  };

  return (
    <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
      <DialogContent className="lg:max-h-screen overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
          >
            {/* RESUME TITLE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resume Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Full Stack Developer Angular, Java"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="md:col-span-2 mt-4">
              <DialogFooter>
                <DialogClose>
                  <Button
                    type="reset"
                    variant="outline"
                    className="mt-2 md:mt-0 w-full"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={!formState.isDirty}>
                  Save
                  {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateResume;
