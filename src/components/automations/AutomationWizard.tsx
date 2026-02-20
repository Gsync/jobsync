"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CreateAutomationSchema, type CreateAutomationInput } from "@/models/automation.schema";
import { createAutomation, updateAutomation } from "@/actions/automation.actions";
import { toast } from "@/components/ui/use-toast";
import type { AutomationWithResume } from "@/models/automation.model";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { EuresOccupationCombobox } from "@/components/automations/EuresOccupationCombobox";

interface Resume {
  id: string;
  title: string;
}

interface AutomationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: Resume[];
  onSuccess: () => void;
  editAutomation?: AutomationWithResume | null;
}

const STEPS = [
  { id: "basics", title: "Basics", description: "Name your automation" },
  { id: "search", title: "Search", description: "Configure search criteria" },
  { id: "resume", title: "Resume", description: "Select resume for matching" },
  { id: "matching", title: "Matching", description: "Set match threshold" },
  { id: "schedule", title: "Schedule", description: "When to run" },
  { id: "review", title: "Review", description: "Confirm settings" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

export function AutomationWizard({
  open,
  onOpenChange,
  resumes,
  onSuccess,
  editAutomation,
}: AutomationWizardProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateAutomationInput>({
    resolver: zodResolver(CreateAutomationSchema),
    mode: "onChange",
    defaultValues: {
      name: editAutomation?.name ?? "",
      jobBoard: (editAutomation?.jobBoard as "jsearch" | "eures") ?? "jsearch",
      keywords: editAutomation?.keywords ?? "",
      location: editAutomation?.location ?? "",
      resumeId: editAutomation?.resumeId ?? "",
      matchThreshold: editAutomation?.matchThreshold ?? 80,
      scheduleHour: editAutomation?.scheduleHour ?? 8,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: editAutomation?.name ?? "",
        jobBoard: (editAutomation?.jobBoard as "jsearch" | "eures") ?? "jsearch",
        keywords: editAutomation?.keywords ?? "",
        location: editAutomation?.location ?? "",
        resumeId: editAutomation?.resumeId ?? "",
        matchThreshold: editAutomation?.matchThreshold ?? 80,
        scheduleHour: editAutomation?.scheduleHour ?? 8,
      });
      setStep(0);
    }
  }, [open, editAutomation, form]);

  const jobBoard = form.watch("jobBoard");
  const connectorParams = form.watch("connectorParams");

  const tryParseConnectorParams = (params?: string) => {
    try { return params ? JSON.parse(params) : undefined; } catch { return undefined; }
  };

  const onSubmit = async (data: CreateAutomationInput) => {
    setIsSubmitting(true);
    try {
      const result = editAutomation
        ? await updateAutomation(editAutomation.id, data)
        : await createAutomation(data);

      if (result.success) {
        toast({
          title: editAutomation ? "Automation updated" : "Automation created",
          description: editAutomation
            ? "Your automation has been updated successfully."
            : "Your automation has been created and will run at the scheduled time.",
        });
        form.reset();
        setStep(0);
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save automation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 0:
        return (form.getValues("name")?.trim().length ?? 0) > 0;
      case 1:
        return (
          (form.getValues("keywords")?.trim().length ?? 0) > 0 &&
          (form.getValues("location")?.trim().length ?? 0) > 0
        );
      case 2:
        return (form.getValues("resumeId")?.length ?? 0) > 0;
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    form.reset();
    setStep(0);
    onOpenChange(false);
  };

  const selectedResume = resumes.find((r) => r.id === form.getValues("resumeId"));

  const renderStepContent = () => {
    return (
      <>
        {/* Step 0: Basics */}
        <div className={step === 0 ? "space-y-4" : "hidden"}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Automation Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Full Stack Jobs Calgary" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive name to identify this automation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobBoard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Board</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job board" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="jsearch">JSearch (Google Jobs)</SelectItem>
                    <SelectItem value="eures">EURES (European Jobs)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The job board to search for vacancies
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Step 1: Search */}
        <div className={step === 1 ? "space-y-4" : "hidden"}>
          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search Keywords</FormLabel>
                <FormControl>
                  {jobBoard === "eures" ? (
                    <EuresOccupationCombobox
                      field={field}
                      language={tryParseConnectorParams(connectorParams)?.language}
                    />
                  ) : (
                    <Input placeholder="e.g., Full Stack Developer" {...field} />
                  )}
                </FormControl>
                <FormDescription>
                  {jobBoard === "eures"
                    ? "Search or type an occupation title (ESCO)"
                    : "Job titles, skills, or keywords to search for"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Calgary, AB" {...field} />
                </FormControl>
                <FormDescription>
                  {jobBoard === "eures"
                    ? "Country code (e.g., de, at, fr) or NUTS region code"
                    : "City, state/province, or region to search in"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Step 2: Resume */}
        <div className={step === 2 ? "space-y-4" : "hidden"}>
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
            <p className="text-sm text-muted-foreground">
              No resumes found. Please create a resume in your profile first.
            </p>
          )}
        </div>

        {/* Step 3: Matching */}
        <div className={step === 3 ? "space-y-4" : "hidden"}>
          <FormField
            control={form.control}
            name="matchThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Match Threshold: {field.value}%
                </FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>
                  Only save jobs that match your resume above this percentage.
                  Higher = fewer but better matches.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Step 4: Schedule */}
        <div className={step === 4 ? "space-y-4" : "hidden"}>
          <FormField
            control={form.control}
            name="scheduleHour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Run Time</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(parseInt(val))}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOURS.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value.toString()}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The automation will run daily at this time (server timezone)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Step 5: Review */}
        <div className={step === 5 ? "space-y-4" : "hidden"}>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{form.getValues("name") || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job Board</span>
              <span className="font-medium">
                {jobBoard === "eures" ? "EURES" : jobBoard === "jsearch" ? "JSearch" : jobBoard || "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Keywords</span>
              <span className="font-medium">{form.getValues("keywords") || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{form.getValues("location") || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resume</span>
              <span className="font-medium">{selectedResume?.title || "Not selected"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match Threshold</span>
              <span className="font-medium">{form.getValues("matchThreshold") ?? 80}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule</span>
              <span className="font-medium">
                Daily at {(form.getValues("scheduleHour") ?? 8).toString().padStart(2, "0")}:00
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editAutomation ? "Edit Automation" : "Create Automation"}
          </DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-8 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const firstError = Object.values(errors)[0];
            if (firstError?.message) {
              toast({
                title: "Validation Error",
                description: firstError.message as string,
                variant: "destructive",
              });
            }
          })}>
            <div className="py-4">{renderStepContent()}</div>

            <DialogFooter className="gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={!canGoNext()}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editAutomation ? "Update" : "Create"} Automation
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
