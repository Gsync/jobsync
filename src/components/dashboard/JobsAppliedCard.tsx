"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function JobsAppliedCard() {
  const router = useRouter();
  return (
    <Card className="sm:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-600">Dashboard</CardTitle>
        <CardDescription className="max-w-lg text-balance leading-relaxed">
          Create new jobs, tasks, automations, and questions.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex gap-2 items-start">
        <div className="flex flex-col gap-2 items-start">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/myjobs?add-job=true")}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            <span className="sm:not-sr-only sm:whitespace-nowrap">
              New Job
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/tasks?add-task=true")}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            <span className="sm:not-sr-only sm:whitespace-nowrap">
              New Task
            </span>
          </Button>
        </div>
        <div className="flex flex-col gap-2 items-start">
          <Button
            variant="outline"
            onClick={() =>
              router.push("/dashboard/automations?add-automation=true")
            }
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            <span className="sm:not-sr-only sm:whitespace-nowrap">
              New Automation
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push("/dashboard/questions?add-question=true")
            }
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            <span className="sm:not-sr-only sm:whitespace-nowrap">
              New Question
            </span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
