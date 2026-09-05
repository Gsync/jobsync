"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import type { CreateAutomationInput } from "@/models/automation.schema";
import { toastError } from "@/lib/toast";
import type { AutomationWithResume } from "@/models/automation.model";
import { AtsSearchStep } from "./AtsSearchStep";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { STEPS, type WizardResume } from "./automation-wizard/wizardConfig";
import { useWizardForm } from "./automation-wizard/useWizardForm";
import { StepBasics } from "./automation-wizard/StepBasics";
import { StepResume } from "./automation-wizard/StepResume";
import { StepMatching } from "./automation-wizard/StepMatching";
import { StepSchedule } from "./automation-wizard/StepSchedule";
import { StepReview } from "./automation-wizard/StepReview";

interface AutomationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: WizardResume[];
  automations: AutomationWithResume[];
  onSuccess: () => void;
  editAutomation?: AutomationWithResume | null;
}

export function AutomationWizard({
  open,
  onOpenChange,
  resumes,
  automations,
  onSuccess,
  editAutomation,
}: AutomationWizardProps) {
  const {
    form,
    formValues,
    step,
    isSubmitting,
    atsKey,
    atsConfig,
    takenHours,
    canGoNext,
    nextStep,
    prevStep,
    handleClose,
    onSubmit,
  } = useWizardForm({
    open,
    onOpenChange,
    automations,
    onSuccess,
    editAutomation,
  });

  const selectedResume = resumes.find((r) => r.id === formValues.resumeId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              const firstError = Object.values(errors)[0];
              if (firstError?.message) {
                toastError(firstError.message as string, "Validation Error");
              }
            })}
          >
            {/* Every step stays mounted — hiding rather than unmounting keeps
                each step's field state alive while navigating. */}
            <div className="py-4">
              <div className={step === 0 ? "space-y-4" : "hidden"}>
                <StepBasics form={form} />
              </div>

              <div className={step === 1 ? "space-y-4" : "hidden"}>
                <AtsSearchStep
                  provider={formValues.jobBoard}
                  value={atsConfig}
                  onChange={(next) =>
                    form.setValue(
                      "sourceConfig",
                      { [atsKey]: next } as CreateAutomationInput["sourceConfig"],
                      { shouldValidate: true },
                    )
                  }
                />
              </div>

              <div className={step === 2 ? "space-y-4" : "hidden"}>
                <StepResume form={form} resumes={resumes} />
              </div>

              <div className={step === 3 ? "space-y-4" : "hidden"}>
                <StepMatching form={form} />
              </div>

              <div className={step === 4 ? "space-y-4" : "hidden"}>
                <StepSchedule form={form} takenHours={takenHours} />
              </div>

              <div className={step === 5 ? "space-y-4" : "hidden"}>
                <StepReview
                  formValues={formValues}
                  atsConfig={atsConfig}
                  selectedResume={selectedResume}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext()}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
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
