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
import { createActivityType } from "@/actions/activity.actions";

const AddActivityTypeFormSchema = z.object({
  label: z
    .string({ error: "Activity type label is required." })
    .min(1, { message: "Activity type label cannot be empty." })
    .max(60, {
      message: "Activity type label must be 60 characters or fewer.",
    }),
});

type AddActivityTypeProps = {
  reloadActivityTypes: () => void;
};

function AddActivityType({ reloadActivityTypes }: AddActivityTypeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof AddActivityTypeFormSchema>>({
    resolver: zodResolver(AddActivityTypeFormSchema),
    defaultValues: { label: "" },
  });

  const { reset } = form;

  const openDialog = () => {
    reset();
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof AddActivityTypeFormSchema>) => {
    startTransition(async () => {
      try {
        await createActivityType(values.label);
        toast({
          variant: "success",
          description: "Activity type has been added successfully.",
        });
        setDialogOpen(false);
        reset();
        reloadActivityTypes();
      } catch {
        toast({
          variant: "destructive",
          title: "Error!",
          description: "Failed to create activity type.",
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
          New Activity Type
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity Type</DialogTitle>
            <DialogDescription>
              Add a new activity type to categorize your activities and tasks.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Type Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Networking, Interview Prep"
                        {...field}
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
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Save
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

export default AddActivityType;
