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
} from "@/actions/mock.actions";

export default function DeveloperContainer() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleGenerateActivities = async () => {
    setIsGenerating(true);
    setMessage(null);

    const result = await generateMockActivitiesAction();

    if (result.success) {
      setMessage({
        type: "success",
        text: result.message || "Mock activities generated successfully",
      });
    } else {
      setMessage({
        type: "error",
        text: result.message || "Failed to generate mock activities",
      });
    }

    setIsGenerating(false);
  };

  const handleClearActivities = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all mock activities? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsClearing(true);
    setMessage(null);

    const result = await clearMockActivitiesAction();

    if (result.success) {
      setMessage({
        type: "success",
        text: result.message || "Mock activities cleared successfully",
      });
    } else {
      setMessage({
        type: "error",
        text: result.message || "Failed to clear mock activities",
      });
    }

    setIsClearing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Options</h1>
        <p className="text-muted-foreground mt-2">
          Tools for development and testing. Only available in development mode.
        </p>
      </div>

      {message && (
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
      )}

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
              onClick={handleGenerateActivities}
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
              onClick={handleClearActivities}
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
