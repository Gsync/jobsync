"use client";
import { Loader } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "../ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { CopyResumeFormSchema } from "@/models/copyResumeForm.schema";
import { ProfileDocument } from "@/models/profile.model";
import {
  copyResume,
  getResumeCopyTitleSuggestion,
} from "@/actions/profile.actions";

type CopyResumeDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  sourceDoc: ProfileDocument | null;
  onCopied: () => void;
};

function CopyResumeDialog({
  open,
  setOpen,
  sourceDoc,
  onCopied,
}: CopyResumeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingTitle, setLoadingTitle] = useState(false);

  const form = useForm<z.infer<typeof CopyResumeFormSchema>>({
    resolver: zodResolver(CopyResumeFormSchema),
    mode: "onChange",
    defaultValues: { title: "" },
  });

  const {
    reset,
    formState: { isValid },
  } = form;

  // The suggestion needs every title the user owns, which the paginated
  // table does not have — so ask the server each time the dialog opens.
  useEffect(() => {
    if (!open || !sourceDoc?.id) return;
    let cancelled = false;
    setLoadingTitle(true);
    reset({ title: "" });
    (async () => {
      const { success, data, message } = await getResumeCopyTitleSuggestion(
        sourceDoc.id,
      );
      if (cancelled) return;
      if (success && data) {
        reset({ title: data });
      } else {
        toastError(message);
      }
      setLoadingTitle(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sourceDoc?.id, reset]);

  const onSubmit = (values: z.infer<typeof CopyResumeFormSchema>) => {
    if (!sourceDoc?.id) return;
    startTransition(async () => {
      const { success, data, message } = await copyResume(
        sourceDoc.id,
        values.title,
      );
      if (!success) {
        toastError(message);
        return;
      }
      reset({ title: "" });
      setOpen(false);
      onCopied();
      toastSuccess(`Copy created: "${data.title}"`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a copy</DialogTitle>
          <DialogDescription>
            Copies the sections and contact info of &quot;{sourceDoc?.title}
            &quot;. The attachment is not copied.
          </DialogDescription>
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
                  <FormLabel>Resume Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loadingTitle}
                      data-testid="copy-resume-title-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="mt-2 md:mt-0"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isPending || loadingTitle}
              >
                Create copy
                {isPending && (
                  <Loader className="h-4 w-4 shrink-0 animate-spin" />
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CopyResumeDialog;
