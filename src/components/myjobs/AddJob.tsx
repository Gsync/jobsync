"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { addJob, updateJob } from "@/actions/job.actions";
import { Link, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState, useTransition } from "react";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Company,
  JOB_TYPES,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
  WORKPLACE_TYPES,
} from "@/models/job.model";
import { addDays } from "date-fns";
import { z } from "zod";
import { toastActionResult, toastError } from "@/lib/toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import SelectFormCtrl from "../Select";
import { DatePicker } from "../DatePicker";
import { SALARY_RANGES } from "@/lib/data/salaryRangeData";
import TiptapEditor from "../TiptapEditor";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Combobox } from "../ComboBox";
import { NotesCollapsibleSection } from "./NotesCollapsibleSection";
import { CoverLetter, Resume } from "@/models/profile.model";
import { getResumeList } from "@/actions/profile.actions";
import { getCoverLetterList } from "@/actions/coverLetter.actions";
import { TagInput } from "./TagInput";
import { IncompleteResumeHint } from "../IncompleteResumeHint";
import {
  buildIncompleteResumeHint,
  hasMinResumeSections,
} from "@/lib/resumeSections";
import { APP_CONSTANTS, APPLIED_STATUS_VALUES } from "@/lib/constants";
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";
import { FormSection } from "./add-job/FormSection";
import { SegmentedRadio } from "./add-job/SegmentedRadio";
import { StatusSegment } from "./add-job/StatusSegment";
import { AddJobFooter } from "./add-job/AddJobFooter";
import {
  dueDateHint,
  missingRequiredFields,
  RequiredField,
} from "./add-job/addJobHints";

type AddJobProps = {
  jobStatuses: JobStatus[];
  companies: Company[];
  jobTitles: JobTitle[];
  locations: JobLocation[];
  jobSources: JobSource[];
  tags: Tag[];
  editJob?: JobResponse | null;
  resetEditJob: () => void;
  initialOpen?: boolean;
  hideTrigger?: boolean;
  redirectPath?: string;
};

export function AddJob({
  jobStatuses,
  companies,
  jobTitles,
  locations,
  jobSources,
  tags,
  editJob,
  resetEditJob,
  initialOpen,
  hideTrigger,
  redirectPath,
}: AddJobProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(initialOpen ?? false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>(tags);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!dialogOpen && searchParams.get("add-job") === "true") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("add-job");
      const newPath = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      router.replace(newPath);
    }
  }, [dialogOpen, router, searchParams]);
  // Pre-fill with the last-used location/source, but only if that entity
  // still exists (handles deletion and cross-user localStorage collisions,
  // since `locations`/`jobSources` are already scoped to the current user).
  const lastLocationId = getFromLocalStorage(
    APP_CONSTANTS.LAST_JOB_LOCATION_STORAGE_KEY,
    null,
  );
  const lastSourceId = getFromLocalStorage(
    APP_CONSTANTS.LAST_JOB_SOURCE_STORAGE_KEY,
    null,
  );
  const lastUsedLocation = locations.find((l) => l.id === lastLocationId)?.id;
  const lastUsedSource = jobSources.find((s) => s.id === lastSourceId)?.id;
  // By value, not position: the list's order is not guaranteed.
  const draftStatusId = jobStatuses.find((s) => s.value === "draft")?.id;
  const appliedStatusId = jobStatuses.find((s) => s.value === "applied")?.id;
  const newStatusId = jobStatuses.find((s) => s.value === "new")?.id;
  const newJobDefaultValues = {
    type: Object.keys(JOB_TYPES)[0],
    workplaceType: "ONSITE",
    dueDate: addDays(new Date(), APP_CONSTANTS.DEFAULT_JOB_DUE_DAYS),
    status: draftStatusId,
    salaryRange: "",
    jobUrl: "",
    jobDescription: "N/A",
    location: lastUsedLocation,
    source: lastUsedSource,
  };

  const form = useForm<z.infer<typeof AddJobFormSchema>>({
    resolver: zodResolver(AddJobFormSchema) as any,
    defaultValues: newJobDefaultValues,
  });

  const { setValue, reset } = form;

  // The date the form filled in itself, so it can take it back again.
  const [autoFilledDate, setAutoFilledDate] = useState<Date | null>(null);

  const loadResumes = useCallback(async () => {
    try {
      const resumes = await getResumeList(1, APP_CONSTANTS.RESUME_PICKER_LIMIT);
      setResumes(resumes.data ?? []);
    } catch (error) {
      console.error("Failed to load resumes:", error);
    }
  }, [setResumes]);

  const loadCoverLetters = useCallback(async () => {
    try {
      const result = await getCoverLetterList(1, 100);
      setCoverLetters(result.data);
    } catch (error) {
      console.error("Failed to load cover letters:", error);
    }
  }, [setCoverLetters]);

  useEffect(() => {
    if (editJob) {
      reset({
        id: editJob.id,
        userId: editJob.userId,
        title: editJob.JobTitle.id,
        company: editJob.Company.id,
        location: editJob.Location?.id,
        type: editJob.jobType,
        workplaceType: editJob.workplaceType ?? undefined,
        source: editJob.JobSource?.id,
        status: editJob.Status.id,
        dueDate: editJob.dueDate,
        salaryRange: editJob.salaryRange ?? "",
        jobDescription: editJob.description,
        jobUrl: editJob.jobUrl ?? "",
        dateApplied: editJob.appliedDate ?? undefined,
        resume: editJob.Resume?.id ?? undefined,
        coverLetter: editJob.CoverLetter?.id ?? undefined,
        tags: editJob.tags?.map((t) => t.id) ?? [],
      });
      // Merge any tags from editJob into the local pool so they're selectable
      if (editJob.tags && editJob.tags.length > 0) {
        setAvailableTags((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          const incoming = editJob.tags!.filter((t) => !existing.has(t.id));
          return incoming.length > 0 ? [...prev, ...incoming] : prev;
        });
      }
      setAutoFilledDate(null);
      setDialogOpen(true);
    }
  }, [editJob, reset]);

  useEffect(() => {
    if (!dialogOpen) return;
    loadResumes();
    loadCoverLetters();
  }, [dialogOpen, loadResumes, loadCoverLetters]);

  function onSubmit(data: z.infer<typeof AddJobFormSchema>) {
    const selected = resumes.find((r) => r.id === data.resume);
    if (selected && !hasMinResumeSections(selected._count?.ResumeSections)) {
      toastError(buildIncompleteResumeHint());
      return;
    }
    startTransition(async () => {
      const result = editJob ? await updateJob(data) : await addJob(data);
      toastActionResult(result, {
        success: `Job has been ${editJob ? "updated" : "created"} successfully`,
        onSuccess: () => {
          saveToLocalStorage(
            APP_CONSTANTS.LAST_JOB_LOCATION_STORAGE_KEY,
            data.location,
          );
          saveToLocalStorage(
            APP_CONSTANTS.LAST_JOB_SOURCE_STORAGE_KEY,
            data.source,
          );
          reset();
          setDialogOpen(false);
          redirect(redirectPath ?? "/dashboard/myjobs");
        },
      });
    });
  }

  const pageTitle = editJob ? "Edit Job" : "Add Job";
  const pageDescription = editJob ? (
    "Update the details of this job application."
  ) : (
    <>
      Track a new job application. Fields marked{" "}
      <span className="text-destructive">*</span> are required.
    </>
  );

  const addJobForm = () => {
    reset(newJobDefaultValues);
    setAutoFilledDate(null);
    resetEditJob();
    setDialogOpen(true);
  };

  // Mirrors jobFieldsForStage: only Applied stamps today's date.
  const jobStatusChange = (statusId: string) => {
    const value = jobStatuses.find((s) => s.id === statusId)?.value ?? "";
    const date = form.getValues("dateApplied");
    if (value === "applied" && !date) {
      const today = new Date();
      setAutoFilledDate(today);
      setValue("dateApplied", today);
    } else if (
      !APPLIED_STATUS_VALUES.includes(value) &&
      date &&
      // react-hook-form stores a copy, so compare by time, not identity
      date.getTime() === autoFilledDate?.getTime()
    ) {
      setAutoFilledDate(null);
      setValue("dateApplied", undefined);
    }
  };

  // A date the user picks means they applied, as the old toggle did.
  const dateAppliedChange = (date?: Date) => {
    setAutoFilledDate(null);
    const status = form.getValues("status");
    if (
      date &&
      appliedStatusId &&
      (status === draftStatusId || status === newStatusId)
    ) {
      setValue("status", appliedStatusId);
    }
  };

  const closeDialog = () => setDialogOpen(false);

  const [title, company, location, source, dueDate, dateApplied] = form.watch([
    "title",
    "company",
    "location",
    "source",
    "dueDate",
    "dateApplied",
  ]);
  const missing = missingRequiredFields({ title, company, location, source });
  const isAutoFilledDate =
    !!dateApplied &&
    !!autoFilledDate &&
    dateApplied.getTime() === autoFilledDate.getTime();
  // Validation runs before the transition starts, so isPending alone is late
  const isSaving = form.formState.isSubmitting || isPending;
  const lastUsedHint = (
    <span className="ml-auto text-xs leading-none text-muted-foreground">last used</span>
  );

  // Combobox does not forward field.ref, so focus via the wrapper instead
  const jumpToField = (f: RequiredField) => {
    const el = document.getElementById(`add-job-field-${f}`);
    el?.scrollIntoView({ block: "center" });
    el?.querySelector<HTMLElement>("button, input")?.focus();
  };

  // Capture phase runs before Tiptap's own Mod-Enter hard break
  const submitOnModEnter = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
    // Saving the job from a note would drop the unsaved note
    if ((e.target as HTMLElement).closest("[data-job-notes]")) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat || isSaving) return;
    form.handleSubmit(onSubmit)();
  };

  const requiredMark = (
    <span className="text-sm leading-none text-destructive" aria-hidden="true">
      *
    </span>
  );

  return (
    <>
      {!hideTrigger && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={addJobForm}
          data-testid="add-job-btn"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            New Job
          </span>
        </Button>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay>
          <DialogContent className="flex max-h-[95vh] flex-col gap-0 p-0 lg:max-w-[880px]">
            <DialogHeader className="px-8 pt-6 pb-5">
              <DialogTitle data-testid="add-job-dialog-title">
                {pageTitle}
              </DialogTitle>
              <DialogDescription>{pageDescription}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                onKeyDownCapture={submitOnModEnter}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-7 overflow-y-auto px-8 py-6">
                  <FormSection id="add-job-role" title="Role details">
                    {/* Job URL */}
                    <FormField
                      control={form.control}
                      name="jobUrl"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <div className="flex items-baseline gap-1">
                            <FormLabel>Job URL</FormLabel>
                            <span className="text-xs leading-none text-muted-foreground">
                              · optional, keeps the posting one click away
                            </span>
                          </div>
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              <Link aria-hidden="true" />
                            </InputGroupAddon>
                            <FormControl>
                              <InputGroupInput
                                placeholder="Copy and paste job link here"
                                {...field}
                              />
                            </FormControl>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Job Title */}
                      <div id="add-job-field-title">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                <FormLabel>Job Title</FormLabel>
                                {requiredMark}
                              </div>
                              <FormControl>
                                <Combobox
                                  options={jobTitles}
                                  field={field}
                                  creatable
                                  fullWidth
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Company */}
                      <div id="add-job-field-company">
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                <FormLabel>Company</FormLabel>
                                {requiredMark}
                              </div>
                              <FormControl>
                                <Combobox
                                  options={companies}
                                  field={field}
                                  creatable
                                  fullWidth
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Location */}
                      <div id="add-job-field-location">
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                <FormLabel>Job Location</FormLabel>
                                {requiredMark}
                                {!editJob &&
                                  location &&
                                  location === lastUsedLocation &&
                                  lastUsedHint}
                              </div>
                              <FormControl>
                                <Combobox
                                  options={locations}
                                  field={field}
                                  creatable
                                  fullWidth
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Salary Range */}
                      <FormField
                        control={form.control}
                        name="salaryRange"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Salary Range</FormLabel>
                            <Combobox
                              options={SALARY_RANGES}
                              field={field}
                              creatable
                              freeText
                              label="Salary Range"
                              fullWidth
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Workplace Type */}
                      <FormField
                        control={form.control}
                        name="workplaceType"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Workplace Type</FormLabel>
                            <SegmentedRadio
                              aria-label="Workplace Type"
                              options={Object.entries(WORKPLACE_TYPES).map(
                                ([value, label]) => ({ value, label }),
                              )}
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Job Type */}
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <FormLabel>Job Type</FormLabel>
                              {requiredMark}
                            </div>
                            <SegmentedRadio
                              aria-label="Job Type"
                              options={Object.entries(JOB_TYPES).map(
                                ([value, label]) => ({ value, label }),
                              )}
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormSection>

                  <FormSection id="add-job-tracking" title="Tracking" muted>
                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <div className="flex items-baseline gap-1">
                            <FormLabel>Status</FormLabel>
                            {requiredMark}
                          </div>
                          <StatusSegment
                            statuses={jobStatuses}
                            value={field.value}
                            onValueChange={(id) => {
                              field.onChange(id);
                              jobStatusChange(id);
                            }}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Date Applied */}
                      <FormField
                        control={form.control}
                        name="dateApplied"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date Applied</FormLabel>
                            <DatePicker
                              field={{
                                ...field,
                                onChange: (date?: Date) => {
                                  field.onChange(date);
                                  dateAppliedChange(date);
                                },
                              }}
                              presets={false}
                              isEnabled={true}
                              fullWidth
                            />
                            {isAutoFilledDate && (
                              <p className="text-xs text-primary">
                                Set to today when you marked it Applied
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Due Date */}
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <FormLabel>Due Date</FormLabel>
                              {requiredMark}
                            </div>
                            <DatePicker
                              field={field}
                              presets={true}
                              isEnabled={true}
                              fullWidth
                            />
                            {dueDate && (
                              <p className="text-xs text-muted-foreground">
                                {dueDateHint(dueDate, new Date())}
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Job Source */}
                      <div id="add-job-field-source">
                        <FormField
                          control={form.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                <FormLabel>Job Source</FormLabel>
                                {requiredMark}
                                {!editJob &&
                                  source &&
                                  source === lastUsedSource &&
                                  lastUsedHint}
                              </div>
                              <Combobox
                                options={jobSources}
                                field={field}
                                creatable
                                fullWidth
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection id="add-job-docs" title="Skills & documents">
                    {/* Add Skill Tags */}
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Add Skill</FormLabel>
                          <FormControl>
                            <TagInput
                              availableTags={availableTags}
                              selectedTagIds={field.value ?? []}
                              onChange={(ids) => field.onChange(ids)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Resume */}
                      <FormField
                        control={form.control}
                        name="resume"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <FormLabel>Resume</FormLabel>
                              <span className="text-xs leading-none text-muted-foreground">
                                · Resumes are built on your Profile
                              </span>
                            </div>
                            <SelectFormCtrl
                              label="Resume"
                              fullWidth
                              options={resumes?.map((r) =>
                                hasMinResumeSections(r._count?.ResumeSections)
                                  ? r
                                  : {
                                      ...r,
                                      disabled: true,
                                      suffix: <IncompleteResumeHint />,
                                    },
                              )}
                              field={field}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Cover Letter */}
                      <FormField
                        control={form.control}
                        name="coverLetter"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Cover Letter</FormLabel>
                            <SelectFormCtrl
                              label="Cover Letter"
                              fullWidth
                              options={coverLetters}
                              field={field}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormSection>

                  {/* Job Description */}
                  <FormField
                    control={form.control}
                    name="jobDescription"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-baseline justify-between gap-2">
                          <FormLabel id="job-description-label">
                            Job Description
                          </FormLabel>
                          <span className="text-xs leading-none text-muted-foreground">
                            Paste the full posting · powers Job Match
                          </span>
                        </div>
                        <FormControl>
                          <TiptapEditor field={field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editJob && (
                    <div data-job-notes>
                      <NotesCollapsibleSection jobId={editJob.id} />
                    </div>
                  )}
                </div>
                <AddJobFooter
                  missing={missing}
                  onJump={jumpToField}
                  onCancel={closeDialog}
                  isPending={isPending}
                  saveDisabled={isSaving}
                />
              </form>
            </Form>
          </DialogContent>
        </DialogOverlay>
      </Dialog>
    </>
  );
}
