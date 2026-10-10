"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateAutomationInput } from "@/models/automation.schema";
import type { WizardResume } from "./wizardConfig";
import Link from "next/link";
import { hasMinResumeSections } from "@/lib/resumeSections";
import { APP_CONSTANTS } from "@/lib/constants";
import { IncompleteResumeHint } from "@/components/IncompleteResumeHint";

export function StepResume({
  form,
  resumes,
}: {
  form: UseFormReturn<CreateAutomationInput>;
  resumes: WizardResume[];
}) {
  const selectableCount = resumes.filter((r) =>
    hasMinResumeSections(r.sectionCount),
  ).length;
  const incompleteCount = resumes.length - selectableCount;
  const min = APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION;

  return (
    <>
      <FormField
        control={form.control}
        name="resumeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resume for Matching</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="[&_[data-incomplete-hint]]:pointer-events-none">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {resumes.map((resume) => (
                  <SelectItem
                    key={resume.id}
                    value={resume.id}
                    disabled={!hasMinResumeSections(resume.sectionCount)}
                  >
                    {resume.title}
                    {hasMinResumeSections(resume.sectionCount) ? null : (
                      <IncompleteResumeHint />
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Jobs will be matched against this resume
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {resumes.length === 0 && (
        <p className="text-sm text-orange-600 dark:text-orange-500">
          No resumes found. Please create a resume with enough content in your
          profile first.
        </p>
      )}
      {resumes.length > 0 && incompleteCount > 0 && (
        <p className="text-sm text-orange-600 dark:text-orange-500">
          {incompleteCount === resumes.length
            ? "None of your resumes can be used yet."
            : `${incompleteCount} of your resumes can't be selected.`}{" "}
          A resume needs at least {min} sections — an attached file does not
          count. Fill it in under{" "}
          <Link href="/dashboard/profile" className="underline">
            Profile
          </Link>
          .
        </p>
      )}
    </>
  );
}
