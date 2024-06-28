"use client";
import { AddExperienceFormSchema } from "@/models/addExperienceForm.schema";
import { WorkExperience } from "@/models/profile.model";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import TiptapEditor from "../TiptapEditor";
import { toast } from "../ui/use-toast";
import { Combobox } from "../ComboBox";
import { DatePicker } from "../DatePicker";
import { Company, JobLocation, JobTitle } from "@/models/job.model";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";

type AddExperienceProps = {
  dialogOpen: boolean;
  setDialogOpen: (e: boolean) => void;
  experienceToEdit?: WorkExperience;
};

function AddExperience({
  dialogOpen,
  setDialogOpen,
  experienceToEdit,
}: AddExperienceProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const pageTitle = experienceToEdit ? "Edit Experience" : "Add Experience";
  const [isPending, startTransition] = useTransition();
  const getTitleCompanyAndLocationData = useCallback(async () => {
    console.log("get titles, companies and locations");
    const [_companies, _titles, _locations] = await Promise.all([
      getAllCompanies(),
      getAllJobTitles(),
      getAllJobLocations(),
    ]);
    setCompanies(_companies);
    setLocations(_locations);
    setJobTitles(_titles);
  }, []);

  const form = useForm<z.infer<typeof AddExperienceFormSchema>>({
    resolver: zodResolver(AddExperienceFormSchema),
    defaultValues: {},
  });

  const { setValue, reset, formState, clearErrors } = form;

  useEffect(() => {
    getTitleCompanyAndLocationData();
  }, [getTitleCompanyAndLocationData]);

  const onSubmit = (data: z.infer<typeof AddExperienceFormSchema>) => {
    startTransition(async () => {
      const res = { res: experienceToEdit, success: true, message: "" };
      // ? await updateResumeSummary(data)
      // : await addResumeSummary(data);
      if (!res.success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: res.message,
        });
      } else {
        reset();
        setDialogOpen(false);
        toast({
          variant: "success",
          description: `Experience has been ${
            experienceToEdit ? "updated" : "added"
          } successfully`,
        });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="h-full lg:max-h-screen md:max-w-[40rem] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
          >
            {/* SECTION TITLE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="sectionTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Experience" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <hr className="md:col-span-2" />
            {/* JOB TITLE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Combobox options={jobTitles!} field={field} creatable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* COMPANY */}
            <div>
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Combobox options={companies!} field={field} creatable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* LOCATION */}
            <div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Job Location</FormLabel>
                    <FormControl>
                      <Combobox options={locations!} field={field} creatable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* START DATE */}
            <div className="flex flex-col">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker
                      field={field}
                      presets={false}
                      isEnabled={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* END Date */}
            <div className="flex flex-col">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      field={field}
                      presets={false}
                      isEnabled={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* JOB DESCRIPTION */}
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
  );
}

export default AddExperience;
