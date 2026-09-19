"use client";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toastActionResult } from "@/lib/toast";
import {
  removeStagePrepQuestion,
  setPrepQuestionAsked,
} from "@/actions/jobStage.actions";
import type { JobStage } from "@/models/jobStage.model";
import { askedTally } from "./stageDisplay";

type StagePrepListProps = {
  stage: JobStage;
  onAddPrepQuestions: () => void;
  onChanged: () => void;
};

export function StagePrepList({
  stage,
  onAddPrepQuestions,
  onChanged,
}: StagePrepListProps) {
  const [, startTransition] = useTransition();
  // Optimistic so the checkbox never lags the click; the reload below is what
  // makes it durable.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const rows = stage.prepQuestions ?? [];
  const { asked, total } = askedTally(stage);

  const toggle = (linkId: string, next: boolean) => {
    setPending((prev) => ({ ...prev, [linkId]: next }));
    startTransition(async () => {
      const res = await setPrepQuestionAsked(linkId, next);
      toastActionResult(res, {
        success: next ? "Marked as asked" : "Marked as not asked",
        onSuccess: onChanged,
      });
    });
  };

  const remove = (linkId: string) => {
    startTransition(async () => {
      const res = await removeStagePrepQuestion(linkId);
      toastActionResult(res, {
        success: "Question removed from the prep list",
        onSuccess: onChanged,
      });
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">
            PREP LIST · INTERVIEW QUESTIONS · {total}
          </span>
          {total > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {asked} of {total} asked
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 cursor-pointer gap-1"
          onClick={onAddPrepQuestions}
        >
          <Plus className="h-3 w-3" />
          Add to Prep List
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Check off a question once your interviewer actually asks it.
      </p>

      {total === 0 ? (
        <p className="mt-2.5 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No questions on this prep list yet.
        </p>
      ) : (
        <ul className="mt-2.5 overflow-hidden rounded-lg border">
          {rows.map((row, index) => {
            const isAsked = pending[row.id] ?? row.asked;
            return (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5",
                  index > 0 && "border-t",
                  isAsked && "bg-emerald-500/10",
                )}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-emerald-600"
                    checked={isAsked}
                    onChange={(e) => toggle(row.id, e.target.checked)}
                  />
                  <span
                    className={cn(
                      "flex-1 text-[13px]",
                      !isAsked && "text-muted-foreground",
                    )}
                  >
                    {row.Question.question}
                  </span>
                </label>
                {isAsked && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Asked
                  </span>
                )}
                {row.Question.tags?.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-[11px]">
                    {tag.label}
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  aria-label={`Remove ${row.Question.question} from the prep list`}
                  onClick={() => remove(row.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
