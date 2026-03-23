"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/i18n/use-translations";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function JobsAppliedCard() {
  const router = useRouter();
  const { t } = useTranslations();
  return (
    <Card className="sm:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-600">{t("dashboard.title")}</CardTitle>
        <CardDescription className="max-w-lg text-balance leading-relaxed">
          {t("dashboard.createJobsAndTasks")}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-2 items-start">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/myjobs")}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1" />
          <span className="sm:not-sr-only sm:whitespace-nowrap">{t("dashboard.newJob")}</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/tasks")}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1" />
          <span className="sm:not-sr-only sm:whitespace-nowrap">{t("dashboard.newTask")}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
