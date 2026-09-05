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

export function StepResume({
  form,
  resumes,
}: {
  form: UseFormReturn<CreateAutomationInput>;
  resumes: WizardResume[];
}) {
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
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.title}
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
    </>
  );
}
