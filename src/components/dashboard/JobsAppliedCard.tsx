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
    <Card className="sm:col-span-2 min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-600">Dashboard</CardTitle>
        <CardDescription className="max-w-lg text-balance leading-relaxed">
          Create new jobs, tasks, automations, and questions.
        </CardDescription>
      </CardHeader>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="justify-start min-w-0"
          onClick={() => router.push("/dashboard/myjobs?add-job=true")}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 truncate">Job</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0"
          onClick={() =>
            router.push("/dashboard/automations?add-automation=true")
          }
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 truncate">Automation</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0"
          onClick={() => router.push("/dashboard/tasks?add-task=true")}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 truncate">Task</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0"
          onClick={() =>
            router.push("/dashboard/questions?add-question=true")
          }
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 truncate">Question</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
