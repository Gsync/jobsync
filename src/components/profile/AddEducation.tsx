"use client";
import { AddEducationFormSchema } from "@/models/AddEductionForm.schema";
import { Education, ResumeSection } from "@/models/profile.model";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
import { DatePicker } from "../DatePicker";
import { Switch } from "../ui/switch";
import TiptapEditor from "../TiptapEditor";
import { Button } from "../ui/button";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "../ui/use-toast";
import { Loader } from "lucide-react";
import { Combobox } from "../ComboBox";
import { JobLocation } from "@/models/job.model";
import { addEducation, updateEducation } from "@/actions/profile.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";

type AddEducationProps = {
  resumeId: string | undefined;
  sectionId: string | undefined;
  dialogOpen: boolean;
  setDialogOpen: (e: boolean) => void;
  educationToEdit?: ResumeSection;
};

function AddEducation({
  resumeId,
  sectionId,
  dialogOpen,
  setDialogOpen,
  educationToEdit,
}: AddEducationProps) {
  const pageTitle = educationToEdit ? "Edit Education" : "Add Education";
  const [isPending, startTransition] = useTransition();
  const [locations, setLocations] = useState<JobLocation[]>([]);

  const getLocationData = useCallback(async () => {
    const _locations = await getAllJobLocations();
    setLocations(_locations);
  }, []);

  const form = useForm<z.infer<typeof AddEducationFormSchema>>({
    resolver: zodResolver(AddEducationFormSchema),
    defaultValues: {
      resumeId,
      sectionId,
      degreeCompleted: true,
    },
  });

  const { watch, reset, formState, resetField } = form;

  const degreeCompletedValue = watch("degreeCompleted");

  useEffect(() => {
    getLocationData();
    if (educationToEdit) {
      const education: Education = educationToEdit?.educations?.at(0)!;
      reset(
        {
          id: education?.id,
          institution: education?.institution,
          degree: education?.degree,
          fieldOfStudy: education?.fieldOfStudy,
          location: education?.location.id,
          startDate: education?.startDate,
          endDate: education?.endDate,
          description: education?.description,
          degreeCompleted: !!education?.endDate,
        },
        { keepDefaultValues: true }
      );
    } else {
      reset(
        {
          resumeId,
          sectionId,
        },
        { keepDefaultValues: true }
      );
    }
  }, [getLocationData, educationToEdit, resumeId, sectionId, reset]);

  const onDegreeCompleted = (completed: boolean) => {
    if (completed) {
      resetField("endDate");
    }
  };

  const onSubmit = (data: z.infer<typeof AddEducationFormSchema>) => {
    startTransition(async () => {
      const res = educationToEdit?.educations?.length
        ? await updateEducation(data)
        : await addEducation(data);
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
          description: `Education has been ${
            educationToEdit ? "updated" : "added"
          } successfully`,
        });
      }
    });
  };

  const closeDialog = () => setDialogOpen(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="h-full md:h-[85%] lg:max-h-screen md:max-w-[40rem] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
          >
            {/* SECTION TITLE */}
            {!sectionId && (
              <>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="sectionTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Education" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <hr className="md:col-span-2" />
              </>
            )}

            {/* INSTITUTION */}
            <div>
              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>School</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Stanford" />
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
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Combobox options={locations!} field={field} creatable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* DEGREE */}
            <div>
              <FormField
                control={form.control}
                name="degree"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Degree</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Bachelor's" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* FIELD OF STUDY */}
            <div>
              <FormField
                control={form.control}
                name="fieldOfStudy"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Field of study</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Computer Science" />
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
                      captionLayout={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* END DATE */}
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
                      isEnabled={degreeCompletedValue!}
                      captionLayout={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CURRENT STUDY */}
            <div className="flex items-center">
              <FormField
                control={form.control}
                name="degreeCompleted"
                render={({ field }) => (
                  <FormItem className="flex flex-row">
                    <Switch
                      checked={field.value}
                      onCheckedChange={(c) => {
                        field.onChange(c);
                        onDegreeCompleted(c);
                      }}
                    />
                    <FormLabel className="flex items-center ml-4 mb-2">
                      {field.value ? "Degree Completed" : "Currently Studying"}
                    </FormLabel>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Description</FormLabel>
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
                <div>
                  <Button
                    type="reset"
                    variant="outline"
                    className="mt-2 md:mt-0 w-full"
                    onClick={closeDialog}
                  >
                    Cancel
                  </Button>
                </div>
                <Button type="submit" disabled={!formState.isDirty}>
                  Save
                  {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEducation;
