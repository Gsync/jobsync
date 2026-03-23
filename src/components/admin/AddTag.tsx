"use client";
import { useTransition, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader, PlusCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { toast } from "../ui/use-toast";
import { createTag } from "@/actions/tag.actions";
import { useTranslations } from "@/i18n";

const AddTagFormSchema = z.object({
  label: z
    .string({ error: "Skill label is required." })
    .min(1, { message: "Skill label cannot be empty." })
    .max(60, { message: "Skill label must be 60 characters or fewer." }),
});

type AddTagProps = {
  reloadTags: () => void;
};

function AddTag({ reloadTags }: AddTagProps) {
  const { t } = useTranslations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof AddTagFormSchema>>({
    resolver: zodResolver(AddTagFormSchema),
    defaultValues: { label: "" },
  });

  const { reset } = form;

  const openDialog = () => {
    reset();
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof AddTagFormSchema>) => {
    startTransition(async () => {
      const result = await createTag(values.label);
      if (result?.success) {
        toast({
          variant: "success",
          description: t("admin.skillCreated"),
        });
        setDialogOpen(false);
        reset();
        reloadTags();
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: result?.message ?? t("admin.skillCreateFailed"),
        });
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        onClick={openDialog}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          {t("admin.addSkill")}
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.addSkillTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.addSkillDesc")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.skillName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("admin.skillPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {t("common.save")}
                  {isPending && (
                    <Loader className="ml-2 h-4 w-4 shrink-0 spinner" />
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddTag;
