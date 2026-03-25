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
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateAutomationSchema, type CreateAutomationInput } from "@/models/automation.schema";
import { createAutomation, updateAutomation } from "@/actions/automation.actions";
import { getUserApiKeys } from "@/actions/apiKey.actions";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "@/i18n";
import type { AutomationWithResume } from "@/models/automation.model";
import { AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Loader2 } from "lucide-react";
import { EuresOccupationCombobox } from "@/components/automations/EuresOccupationCombobox";
import { EuresLocationCombobox } from "@/components/automations/EuresLocationCombobox";
import { getLocationLabel, getCountryCode } from "@/lib/connector/job-discovery/modules/eures/countries";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

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

const STEP_KEYS = [
  { id: "basics", titleKey: "automations.stepBasics", descKey: "automations.stepBasicsDesc" },
  { id: "search", titleKey: "automations.stepSearch", descKey: "automations.stepSearchDesc" },
  { id: "resume", titleKey: "automations.stepResume", descKey: "automations.stepResumeDesc" },
  { id: "matching", titleKey: "automations.stepMatching", descKey: "automations.stepMatchingDesc" },
  { id: "schedule", titleKey: "automations.stepSchedule", descKey: "automations.stepScheduleDesc" },
  { id: "review", titleKey: "automations.stepReview", descKey: "automations.stepReviewDesc" },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

type ScheduleFrequency = "6h" | "12h" | "daily" | "2d" | "weekly";

const SCHEDULE_FREQUENCIES: ScheduleFrequency[] = ["6h", "12h", "daily", "2d", "weekly"];

const FREQUENCY_TRANSLATION_KEYS: Record<ScheduleFrequency, string> = {
  "6h": "automations.scheduleEvery6Hours",
  "12h": "automations.scheduleEvery12Hours",
  "daily": "automations.scheduleDaily",
  "2d": "automations.scheduleEvery2Days",
  "weekly": "automations.scheduleWeekly",
};

export function AutomationWizard({
  open,
  onOpenChange,
  resumes,
  onSuccess,
  editAutomation,
}: AutomationWizardProps) {
  const { t } = useTranslations();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRapidApiKey, setHasRapidApiKey] = useState<boolean | null>(null);
  const [aiScoringEnabled, setAiScoringEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>("daily");

  const form = useForm<CreateAutomationInput>({
    resolver: zodResolver(CreateAutomationSchema),
    mode: "onChange",
    defaultValues: {
      name: editAutomation?.name ?? "",
      jobBoard: (editAutomation?.jobBoard as "jsearch" | "eures" | "arbeitsagentur") ?? "jsearch",
      keywords: editAutomation?.keywords ?? "",
      location: editAutomation?.location ?? "",
      resumeId: editAutomation?.resumeId ?? "",
      matchThreshold: editAutomation?.matchThreshold ?? 80,
      scheduleHour: editAutomation?.scheduleHour ?? 8,
    },
  });

  // U2: Check if RapidAPI key is configured
  useEffect(() => {
    if (open) {
      getUserApiKeys().then((result) => {
        if (result.success && result.data) {
          const hasKey = result.data.some((k) => k.provider === "rapidapi");
          setHasRapidApiKey(hasKey);
        } else {
          setHasRapidApiKey(false);
        }
      }).catch(() => {
        setHasRapidApiKey(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const editParams = editAutomation?.connectorParams
        ? tryParseConnectorParams(editAutomation.connectorParams)
        : undefined;

      // Restore AI scoring state from edit automation
      const editThreshold = editAutomation?.matchThreshold ?? 80;
      const isAiEnabled = editThreshold > 0;
      setAiScoringEnabled(isAiEnabled);

      // Restore schedule frequency from connectorParams
      const editFrequency = editParams?.scheduleFrequency ?? "daily";
      setScheduleFrequency(editFrequency as ScheduleFrequency);

      form.reset({
        name: editAutomation?.name ?? "",
        jobBoard: (editAutomation?.jobBoard as "jsearch" | "eures" | "arbeitsagentur") ?? "jsearch",
        keywords: editAutomation?.keywords ?? "",
        location: editAutomation?.location ?? "",
        resumeId: editAutomation?.resumeId ?? "",
        matchThreshold: editThreshold,
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

  // Helper to update connectorParams while preserving existing values
  const updateConnectorParams = (updates: Record<string, unknown>) => {
    const current = tryParseConnectorParams(form.getValues("connectorParams")) ?? {};
    form.setValue("connectorParams", JSON.stringify({ ...current, ...updates }));
  };

  // Auto-set language in connectorParams from html lang attribute
  useEffect(() => {
    if (jobBoard === "eures" && open) {
      const htmlLang = document.documentElement.lang || "en";
      const current = tryParseConnectorParams(form.getValues("connectorParams"));
      if (!current?.language || current.language !== htmlLang) {
        form.setValue("connectorParams", JSON.stringify({ ...current, language: htmlLang }));
      }
    }
  }, [jobBoard, open, form]);

  // U3: Handle AI scoring toggle
  const handleAiScoringToggle = (enabled: boolean) => {
    setAiScoringEnabled(enabled);
    if (!enabled) {
      form.setValue("matchThreshold", 0);
    } else {
      // Restore a sensible default when re-enabling
      form.setValue("matchThreshold", 80);
    }
  };

  // U4: Sync schedule frequency to connectorParams
  const handleScheduleFrequencyChange = (freq: ScheduleFrequency) => {
    setScheduleFrequency(freq);
    updateConnectorParams({ scheduleFrequency: freq });
  };

  const onSubmit = async (data: CreateAutomationInput) => {
    setIsSubmitting(true);
    try {
      // Ensure schedule frequency is in connectorParams before submit
      const currentParams = tryParseConnectorParams(data.connectorParams) ?? {};
      if (scheduleFrequency !== "daily") {
        data.connectorParams = JSON.stringify({ ...currentParams, scheduleFrequency });
      }

      const result = editAutomation
        ? await updateAutomation(editAutomation.id, data)
        : await createAutomation(data);

      if (result.success) {
        toast({
          title: editAutomation ? t("automations.automationUpdated") : t("automations.automationCreated"),
          description: editAutomation
            ? t("automations.automationUpdatedDesc")
            : t("automations.automationCreatedDesc"),
        });
        form.reset();
        setStep(0);
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: t("automations.validationError"),
          description: result.message || t("automations.somethingWentWrong"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("automations.validationError"),
        description: t("automations.failedToSave"),
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
    if (step < STEP_KEYS.length - 1) {
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

  // U4: Get display text for the selected schedule frequency in the review step
  const getScheduleReviewText = () => {
    const hour = (form.getValues("scheduleHour") ?? 8).toString().padStart(2, "0");
    const freqKey = FREQUENCY_TRANSLATION_KEYS[scheduleFrequency];
    const freqLabel = t(freqKey);

    if (scheduleFrequency === "daily") {
      return `${t("automations.dailyAt")} ${hour}:00`;
    }
    return `${freqLabel} (${hour}:00)`;
  };

  // U3: Get display text for match threshold in review step
  const getMatchThresholdReviewText = () => {
    if (!aiScoringEnabled || (form.getValues("matchThreshold") ?? 80) === 0) {
      return t("automations.collectOnlyMode");
    }
    return `${form.getValues("matchThreshold") ?? 80}%`;
  };

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
                <FormLabel>{t("automations.automationName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("automations.automationNamePlaceholder")} {...field} />
                </FormControl>
                <FormDescription>
                  {t("automations.automationNameDesc")}
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
                <FormLabel>{t("automations.jobBoard")}</FormLabel>
                <Select
                  onValueChange={(val) => {
                    // U2: Prevent selecting jsearch if no API key
                    if (val === "jsearch" && hasRapidApiKey === false) {
                      return;
                    }
                    field.onChange(val);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("automations.selectJobBoard")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <TooltipProvider>
                      {hasRapidApiKey === false ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground opacity-50">
                              <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                              {t("automations.jsearch")}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>{t("automations.jsearchApiKeyRequired")}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SelectItem value="jsearch">{t("automations.jsearch")}</SelectItem>
                      )}
                    </TooltipProvider>
                    <SelectItem value="eures">{t("automations.eures")}</SelectItem>
                    <SelectItem value="arbeitsagentur">{t("automations.arbeitsagentur")}</SelectItem>
                  </SelectContent>
                </Select>
                {/* U2: Warning text below the select when JSearch has no API key */}
                {hasRapidApiKey === false && jobBoard === "jsearch" && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("automations.jsearchApiKeyRequired")}
                  </p>
                )}
                <FormDescription>
                  {t("automations.jobBoardDesc")}
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
                <FormLabel>{t("automations.searchKeywords")}</FormLabel>
                <FormControl>
                  {jobBoard === "eures" ? (
                    <EuresOccupationCombobox
                      field={field}
                      language={tryParseConnectorParams(connectorParams)?.language}
                    />
                  ) : (
                    <Input placeholder={t("automations.keywordsPlaceholder")} {...field} />
                  )}
                </FormControl>
                <FormDescription>
                  {jobBoard !== "eures"
                    ? t("automations.keywordsDesc")
                    : undefined}
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
                <FormLabel>{t("automations.location")}</FormLabel>
                <FormControl>
                  {jobBoard === "eures" ? (
                    <EuresLocationCombobox field={field} />
                  ) : (
                    <Input placeholder={t("automations.locationPlaceholder")} {...field} />
                  )}
                </FormControl>
                {jobBoard !== "eures" && (
                  <FormDescription>
                    {t("automations.locationDesc")}
                  </FormDescription>
                )}
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
                <FormLabel>{t("automations.resumeForMatching")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("automations.selectResume")} />
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
                  {t("automations.resumeMatchDesc")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {resumes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("automations.noResumes")}
            </p>
          )}
        </div>

        {/* Step 3: Matching (U3: Threshold Toggle) */}
        <div className={step === 3 ? "space-y-4" : "hidden"}>
          {/* U3: AI Match Scoring Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ai-scoring-toggle" className="text-sm font-medium">
                {t("automations.enableAiScoring")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("automations.enableAiScoringDesc")}
              </p>
            </div>
            <Switch
              id="ai-scoring-toggle"
              checked={aiScoringEnabled}
              onCheckedChange={handleAiScoringToggle}
            />
          </div>

          {/* U3: Show collect-only info when AI scoring is disabled */}
          {!aiScoringEnabled && (
            <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
              {t("automations.collectOnlyDesc")}
            </p>
          )}

          <FormField
            control={form.control}
            name="matchThreshold"
            render={({ field }) => (
              <FormItem className={!aiScoringEnabled ? "opacity-50 pointer-events-none" : ""}>
                <FormLabel>
                  {t("automations.matchThreshold")}: {aiScoringEnabled ? `${field.value}%` : t("automations.disabled")}
                </FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[aiScoringEnabled ? field.value : 0]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={!aiScoringEnabled}
                  />
                </FormControl>
                <FormDescription>
                  {t("automations.matchThresholdDesc")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Step 4: Schedule (U4: Flexible Runtimes) */}
        <div className={step === 4 ? "space-y-4" : "hidden"}>
          {/* U4: Schedule Frequency Selector */}
          <div>
            <Label className="text-sm font-medium">{t("automations.scheduleFrequency")}</Label>
            <Select
              onValueChange={(val) => handleScheduleFrequencyChange(val as ScheduleFrequency)}
              value={scheduleFrequency}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t("automations.selectFrequency")} />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {t(FREQUENCY_TRANSLATION_KEYS[freq])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1.5">
              {t("automations.scheduleFrequencyDesc")}
            </p>
          </div>

          <FormField
            control={form.control}
            name="scheduleHour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("automations.preferredStartTime")}</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(parseInt(val))}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("automations.selectTime")} />
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
                  {t("automations.scheduleDesc")}
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
              <span className="text-muted-foreground">{t("automations.reviewName")}</span>
              <span className="font-medium">{form.getValues("name") || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("automations.reviewJobBoard")}</span>
              <span className="font-medium">
                {jobBoard === "eures" ? t("automations.eures") : jobBoard === "jsearch" ? t("automations.jsearch") : jobBoard === "arbeitsagentur" ? t("automations.arbeitsagentur") : jobBoard || "-"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">{t("automations.reviewKeywords")}</span>
              {jobBoard === "eures" && form.getValues("keywords")?.includes("||") ? (
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  {form.getValues("keywords").split("||").filter(Boolean).map((kw) => (
                    <Badge key={kw.trim()} variant="secondary">
                      {kw.trim()}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="font-medium">{form.getValues("keywords") || "-"}</span>
              )}
            </div>
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">{t("automations.reviewLocation")}</span>
              {jobBoard === "eures" && form.getValues("location") ? (
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  {form.getValues("location").split(",").filter(Boolean).map((code) => {
                    const trimmed = code.trim();
                    const isNS = trimmed.toLowerCase() === "ns" || trimmed.toLowerCase().endsWith("-ns");
                    return (
                      <Badge key={trimmed} variant="secondary" className="gap-1">
                        {isNS ? (
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Image
                            src={`/flags/${getCountryCode(trimmed)}.svg`}
                            alt={trimmed}
                            className="h-3.5 w-3.5"
                            width={14}
                            height={14}
                          />
                        )}
                        {getLocationLabel(trimmed)}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <span className="font-medium">{form.getValues("location") || "-"}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("automations.reviewResume")}</span>
              <span className="font-medium">{selectedResume?.title || t("automations.notSelected")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("automations.reviewMatchThreshold")}</span>
              <span className="font-medium">{getMatchThresholdReviewText()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("automations.reviewSchedule")}</span>
              <span className="font-medium">
                {getScheduleReviewText()}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editAutomation ? t("automations.editAutomation") : t("automations.createAutomation")}
          </DialogTitle>
          <DialogDescription>
            {t("automations.step")} {step + 1} {t("automations.of")} {STEP_KEYS.length}: {t(STEP_KEYS[step].descKey)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 mb-4">
          {STEP_KEYS.map((_, i) => (
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
                title: t("automations.validationError"),
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
                  {t("automations.back")}
                </Button>
              )}
              {step < STEP_KEYS.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={!canGoNext()}>
                  {t("automations.next")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editAutomation ? t("automations.updateAutomation") : t("automations.createAutomation")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
