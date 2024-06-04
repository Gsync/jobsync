"use client";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";
import { z } from "zod";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "./ui/use-toast";
import { Combobox } from "./ComboBox";
import { DatePicker } from "./DatePicker";
import SelectFormCtrl from "./Select";
import { JOB_SOURCES } from "@/lib/data/jobSourcesData";
import { SALARY_RANGES } from "@/lib/data/salaryRangeData";
import { useState, useTransition } from "react";
import { addDays } from "date-fns";
import { addJob } from "@/actions/job.actions";
import { Loader } from "lucide-react";

interface AddJobFormProps {
  jobStatuses: { id: string; label: string; value: string }[];
  companies: any[];
  jobTitles: { id: string; label: string; value: string }[];
  locations: { id: string; label: string; value: string }[];
  jobSources: { id: string; label: string; value: string }[];
}

export default function AddJobForm({
  jobStatuses,
  companies,
  jobTitles,
  locations,
  jobSources,
}: AddJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof AddJobFormSchema>>({
    resolver: zodResolver(AddJobFormSchema),
    // mode: "onChange",
    defaultValues: {
      dateApplied: new Date(),
      dueDate: addDays(new Date(), 3),
      status: jobStatuses[0].id,
      salaryRange: "1",
      jobDescription: "Job details are provided here",
    },
  });

  function onSubmit(data: z.infer<typeof AddJobFormSchema>) {
    console.log("add job form data: ", data);
    startTransition(async () => {
      const res = await addJob(data);
      form.reset();
      console.log("RESPONSE DATA: ", res);
    });
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
        >
          {/* Job Title */}
          <div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Combobox options={jobTitles} field={field} creatable />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Company */}
          <div>
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Combobox options={companies} field={field} creatable />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Location */}
          <div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Job Location</FormLabel>
                  <FormControl>
                    <Combobox options={locations} field={field} creatable />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Job Source */}
          <div>
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Job Source</FormLabel>
                  <Combobox options={jobSources} field={field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Status */}
          <div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-col [&>button]:capitalize">
                  <FormLabel>Status</FormLabel>
                  <SelectFormCtrl
                    label="Job Status"
                    options={jobStatuses}
                    field={field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Due Date */}
          <div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <DatePicker field={field} presets={true} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Date Applied */}
          <div className="flex flex-col">
            <FormField
              control={form.control}
              name="dateApplied"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Applied</FormLabel>
                  <DatePicker field={field} presets={false} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Salary Range */}
          <div>
            <FormField
              control={form.control}
              name="salaryRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Salary Range</FormLabel>
                  <FormControl>
                    <SelectFormCtrl
                      label="Salary Range"
                      options={SALARY_RANGES}
                      field={field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Job Description */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="h-36 overflow-auto"
                      placeholder="Copy and paste you job description here."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="md:col-span-2">
            <DialogFooter
            // className="md:col-span
            >
              <DialogClose>
                <Button
                  type="reset"
                  variant="outline"
                  className="mt-2 md:mt-0 w-full"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                Save
                {isPending ? (
                  <Loader className="h-4 w-4 shrink-0 spinner" />
                ) : null}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </Form>
    </>
  );
}
