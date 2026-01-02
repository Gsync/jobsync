"use client";

import { useEffect, useState } from "react";
import {
  AGENT_STEPS,
  type AgentStep,
  type ProgressUpdate,
} from "@/lib/ai/progress-stream";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiAgentProgressProps {
  isActive: boolean;
}

const AGENT_ORDER: AgentStep[] = [
  "data-analyzer",
  "keyword-expert",
  "scoring-specialist",
  "feedback-expert",
  "synthesis-coordinator",
  "validation",
];

export function MultiAgentProgress({ isActive }: MultiAgentProgressProps) {
  const [currentStep, setCurrentStep] = useState<AgentStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<AgentStep>>(
    new Set()
  );

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(null);
      setCompletedSteps(new Set());
    }
  }, [isActive]);

  // Expose a method to update progress (will be called from parent)
  useEffect(() => {
    const handleProgress = (update: ProgressUpdate) => {
      if (update.status === "started") {
        setCurrentStep(update.step);
      } else if (update.status === "completed") {
        setCompletedSteps((prev) => new Set([...prev, update.step]));
        if (update.step === "complete") {
          setCurrentStep(null);
        }
      }
    };

    // Listen for custom progress events
    window.addEventListener(
      "multiagent-progress" as any,
      ((e: CustomEvent<ProgressUpdate>) => {
        handleProgress(e.detail);
      }) as EventListener
    );

    return () => {
      window.removeEventListener(
        "multiagent-progress" as any,
        (() => {}) as EventListener
      );
    };
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <h4 className="text-sm font-semibold">
          Multi-Agent Analysis in Progress
        </h4>
      </div>

      <div className="space-y-2">
        {AGENT_ORDER.map((step, index) => {
          const stepInfo = AGENT_STEPS[step];
          const isCompleted = completedSteps.has(step);
          const isCurrent = currentStep === step;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div
              key={step}
              className={cn(
                "flex items-start gap-3 p-2 rounded-md transition-colors",
                isCurrent && "bg-primary/10",
                isCompleted && "opacity-60"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {isCurrent && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {isPending && (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stepInfo.emoji}</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-primary",
                      isCompleted && "text-muted-foreground"
                    )}
                  >
                    {stepInfo.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({index + 1}/{AGENT_ORDER.length})
                  </span>
                </div>
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {stepInfo.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {completedSteps.size > 0 && currentStep && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress:</span>
            <span className="font-medium">
              {completedSteps.size} of {AGENT_ORDER.length} agents completed
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(completedSteps.size / AGENT_ORDER.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
