"use client";
import { Loader, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
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
  resumeToEdit?: Resume | null;
  reloadResumes: () => void;
  resetResumeToEdit: () => void;
};

function CreateResume({
  resumeToEdit,
  reloadResumes,
  resetResumeToEdit,
}: CreateResumeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pageTitle = resumeToEdit ? "Edit Resume Title" : "Create Resume";

  const form = useForm<z.infer<typeof CreateResumeFormSchema>>({
    resolver: zodResolver(CreateResumeFormSchema),
  });

  const { setValue, reset, formState, clearErrors } = form;

  useEffect(() => {
    if (resumeToEdit) {
      clearErrors();
      setValue("id", resumeToEdit.id);
      setValue("title", resumeToEdit.title);

      setDialogOpen(true);
    }
  }, [resumeToEdit, setValue, clearErrors]);

  const createResume = () => {
    reset();
    resetResumeToEdit();
    setDialogOpen(true);
  };

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
        setDialogOpen(false);
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
    <>
      <Button size="sm" className="h-8 gap-1" onClick={createResume}>
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Create Resume
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    {isPending ? (
                      <Loader className="h-4 w-4 shrink-0 spinner" />
                    ) : null}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreateResume;
