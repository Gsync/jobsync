"use client";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Info, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import GoalRow from "@/components/dashboard/set-goals-dialog/GoalRow";
import { updateGoalTargets } from "@/actions/dailyGoals.actions";
import { DAILY_GOALS } from "@/lib/constants";
import { toastActionResult } from "@/lib/toast";
import {
  GoalTargetsSchema,
  type GoalStreaks,
  type GoalTargets,
  type GoalTargetsByMonth,
} from "@/models/dailyGoals.model";

interface SetGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  targets: GoalTargets;
  onSaved: (data: {
    targets: GoalTargetsByMonth;
    streaks: GoalStreaks | null;
  }) => void;
}

const FIELDS = [
  {
    name: "jobs",
    label: "Jobs applied per day",
    noun: "jobs",
    ring: "var(--gc-ring-1)",
    min: DAILY_GOALS.JOBS_MIN,
    max: DAILY_GOALS.JOBS_MAX,
  },
  {
    name: "hours",
    label: "Activity hours per day",
    noun: "hours",
    ring: "var(--gc-ring-2)",
    min: DAILY_GOALS.HOURS_MIN,
    max: DAILY_GOALS.HOURS_MAX,
  },
] as const;

export default function SetGoalsDialog({
  open,
  onOpenChange,
  month,
  targets,
  onSaved,
}: SetGoalsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<GoalTargets>({
    resolver: zodResolver(GoalTargetsSchema),
    defaultValues: targets,
    // The sub-line shows the error while typing, not only after Save
    mode: "onChange",
  });
  const { reset } = form;

  // Re-open on the latest targets, not a previous edit
  useEffect(() => {
    if (open) reset(targets);
  }, [open, targets, reset]);

  const onSubmit = (values: GoalTargets) =>
    startTransition(async () => {
      const result = await updateGoalTargets({ month, ...values });
      toastActionResult(result, {
        success: "Daily goals saved.",
        onSuccess: (data) => {
          if (!data) return;
          onSaved(data);
          onOpenChange(false);
        },
      });
    });

  const monthName = format(new Date(`${month}-01T00:00:00`), "MMMM yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The class supplies --gc-ring-*; the dialog is portaled out */}
      <DialogContent className="daily-goals-calendar sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogTitle>Daily goals</DialogTitle>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {monthName}
            </span>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3"
          >
            {FIELDS.map((f) => (
              <GoalRow
                key={f.name}
                control={form.control}
                previous={targets[f.name]}
                {...f}
              />
            ))}
            <div className="flex items-start gap-2.5 rounded-lg bg-muted p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <DialogDescription className="text-[13px]">
                Applies from {monthName} and carries forward until you change
                it. Earlier months keep their own targets.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !form.formState.isDirty}
              >
                {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Save goals
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
