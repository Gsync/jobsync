"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  generateMockActivitiesAction,
  clearMockActivitiesAction,
  generateMockProfileDataAction,
  clearMockProfileDataAction,
} from "@/actions/mock.actions";

type StatusMessage = { type: "success" | "error"; text: string };

function StatusBanner({ message }: { message: StatusMessage }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${
        message.type === "error"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-green-200 bg-green-50 text-green-900"
      }`}
    >
      {message.type === "error" ? (
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="font-semibold">
          {message.type === "error" ? "Error" : "Success"}
        </p>
        <p className="text-sm">{message.text}</p>
      </div>
    </div>
  );
}

export function MockActivitiesCard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);
    const result = await generateMockActivitiesAction();
    setMessage({
      type: result.success ? "success" : "error",
      text:
        result.message ||
        (result.success
          ? "Mock activities generated successfully"
          : "Failed to generate mock activities"),
    });
    setIsGenerating(false);
  };

  const handleClear = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all mock activities? This action cannot be undone.",
      )
    )
      return;

    setIsClearing(true);
    setMessage(null);
    const result = await clearMockActivitiesAction();
    setMessage({
      type: result.success ? "success" : "error",
      text:
        result.message ||
        (result.success
          ? "Mock activities cleared successfully"
          : "Failed to clear mock activities"),
    });
    setIsClearing(false);
  };

  return (
    <div className="space-y-4">
      {message && <StatusBanner message={message} />}
      <Card>
        <CardHeader>
          <CardTitle>Mock Data Management</CardTitle>
          <CardDescription>
            Generate or clear mock activities for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Generate Mock Activities</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Creates 25+ mock activities for the last 10 days with types:
              Learning, Side Project 1, Side Project 2, Job Search, and
              Interview Preparation. Duration is between 20-120 minutes.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isClearing}
              className="w-full"
            >
              {isGenerating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isGenerating ? "Generating..." : "Generate Mock Activities"}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Clear Mock Activities</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deletes only mock activities (marked with [MOCK_DATA] identifier).
              Regular activities are not affected.
            </p>
            <Button
              onClick={handleClear}
              disabled={isClearing || isGenerating}
              variant="destructive"
              className="w-full"
            >
              {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isClearing ? "Clearing..." : "Clear Mock Activities"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MockProfileCard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);
    const result = await generateMockProfileDataAction();
    setMessage({
      type: result.success ? "success" : "error",
      text:
        result.message ||
        (result.success
          ? "Mock profile data generated successfully"
          : "Failed to generate mock profile data"),
    });
    setIsGenerating(false);
  };

  const handleClear = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all mock profile data (resumes, companies, locations, job titles)? This cannot be undone.",
      )
    )
      return;

    setIsClearing(true);
    setMessage(null);
    const result = await clearMockProfileDataAction();
    setMessage({
      type: result.success ? "success" : "error",
      text:
        result.message ||
        (result.success
          ? "Mock profile data cleared successfully"
          : "Failed to clear mock profile data"),
    });
    setIsClearing(false);
  };

  return (
    <div className="space-y-4">
      {message && <StatusBanner message={message} />}
      <Card>
        <CardHeader>
          <CardTitle>Mock Profile Data</CardTitle>
          <CardDescription>
            Generate or clear mock companies, locations, job titles, and resumes
            for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Generate Mock Profile Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Creates 12 FAANG companies, 12 IT-hub locations (US &amp; Canada),
              15 IT job titles (junior → principal), and 8 resumes covering
              junior, intermediate, and senior career levels — each with a
              detailed summary, multi-role work history, and education section.
              Uses <code>[MOCK_DATA]</code> prefix to tag records.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isClearing}
              className="w-full"
            >
              {isGenerating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isGenerating ? "Generating..." : "Generate Mock Profile Data"}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Clear Mock Profile Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deletes all mock resumes (titled with <code>[MOCK_DATA]</code>)
              and their associated sections, then removes mock companies,
              locations, and job titles. Real data is not affected.
            </p>
            <Button
              onClick={handleClear}
              disabled={isClearing || isGenerating}
              variant="destructive"
              className="w-full"
            >
              {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isClearing ? "Clearing..." : "Clear Mock Profile Data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
