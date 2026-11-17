"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  generateMockActivitiesAction,
  generateMockJobsAction,
  generateMockProfileDataAction,
} from "@/actions/mock.actions";
import { toastActionResult } from "@/lib/toast";

export function GenerateMockDataButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Jobs need the mock companies, titles and resumes from the profile step
    const steps = [
      generateMockProfileDataAction,
      generateMockActivitiesAction,
      generateMockJobsAction,
    ];
    let result = { success: true, message: "" };
    for (const step of steps) {
      result = await step();
      if (!result.success) break;
    }
    toastActionResult(result, { success: "Mock data generated" });
    setIsGenerating(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <DatabaseZap className="h-4 w-4" />
        )}
        Generate mock data
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate mock data?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs three generators in order: mock profile data
              (companies, titles, locations and resumes), mock activities, and
              mock jobs. It stops if a step fails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isGenerating}
              onClick={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
            >
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
