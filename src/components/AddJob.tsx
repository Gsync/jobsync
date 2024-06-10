"use client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { addJob, updateJob } from "@/actions/job.actions";
import { Loader, PlusCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useForm } from "react-hook-form";
import { useEffect, useState, useTransition } from "react";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { JOB_TYPES } from "@/models/job.model";
import { addDays } from "date-fns";
import { z } from "zod";
import { toast } from "./ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Combobox } from "./ComboBox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import SelectFormCtrl from "./Select";
import { DatePicker } from "./DatePicker";
import { SALARY_RANGES } from "@/lib/data/salaryRangeData";
import TiptapEditor from "./TiptapEditor";

type AddJobProps = {
  jobStatuses: { id: string; label: string; value: string }[];
  companies: any[];
  jobTitles: { id: string; label: string; value: string }[];
  locations: { id: string; label: string; value: string }[];
  jobSources: { id: string; label: string; value: string }[];
  reloadJobs: () => void;
  editJob?: any;
  resetEditJob: () => void;
};

export function AddJob({
  jobStatuses,
  companies,
  jobTitles,
  locations,
  jobSources,
  reloadJobs,
  editJob,
  resetEditJob,
}: AddJobProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof AddJobFormSchema>>({
    resolver: zodResolver(AddJobFormSchema),
    // mode: "onChange",
    defaultValues: {
      type: Object.keys(JOB_TYPES)[0],
      dateApplied: new Date(),
      dueDate: addDays(new Date(), 3),
      status: jobStatuses[0].id,
      salaryRange: "1",
    },
  });

  const { setValue, reset } = form;

  useEffect(() => {
    if (editJob) {
      setValue("id", editJob.id);
      setValue("userId", editJob.userId);
      setValue("title", editJob.JobTitle.id);
      setValue("company", editJob.Company.id);
      setValue("location", editJob.Location.id);
      setValue("type", editJob.jobType);
      setValue("source", editJob.JobSource.id);
      setValue("status", editJob.Status.id);
      setValue("dueDate", editJob.dueDate);
      setValue("dateApplied", editJob.appliedDate);
      setValue("salaryRange", editJob.salaryRange);
      setValue("jobDescription", editJob.description);
      setDialogOpen(true);
    }
  }, [editJob, setValue]);

  function onSubmit(data: z.infer<typeof AddJobFormSchema>) {
    startTransition(async () => {
      const res = editJob ? await updateJob(data) : await addJob(data);
      reset();
      setDialogOpen(false);
      reloadJobs();
    });
    toast({
      description: `Job has been ${
        editJob ? "updated" : "created"
      } successfully`,
    });
  }

  const pageTitle = editJob ? "Edit Job" : "Add Job";

  const addJobForm = () => {
    reset();
    resetEditJob();
    setDialogOpen(true);
  };

  return (
    <>
      <Button size="sm" className="h-8 gap-1" onClick={addJobForm}>
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add Job
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* <DialogTrigger asChild></DialogTrigger> */}
        <DialogOverlay>
          <DialogContent className="lg:max-w-screen-lg lg:max-h-screen overflow-y-scroll">
            <DialogHeader>
              <DialogTitle>{pageTitle}</DialogTitle>
            </DialogHeader>
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
                          <Combobox
                            options={jobTitles}
                            field={field}
                            creatable
                          />
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
                          <Combobox
                            options={companies}
                            field={field}
                            creatable
                          />
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
                          <Combobox
                            options={locations}
                            field={field}
                            creatable
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Job Type */}
                <div>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="mb-2">Job Type</FormLabel>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-y-1"
                        >
                          {Object.entries(JOB_TYPES).map(([key, value]) => (
                            <FormItem
                              key={key}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={key} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
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
                          <TiptapEditor field={field} />
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
          </DialogContent>
        </DialogOverlay>
      </Dialog>
    </>
  );
}
