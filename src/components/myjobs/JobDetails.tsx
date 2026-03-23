"use client";
import { useTranslations } from "@/i18n/use-translations";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { cn, formatUrl } from "@/lib/utils";
import { JobResponse } from "@/models/job.model";
import { TipTapContentViewer } from "../TipTapContentViewer";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { AiJobMatchSection } from "../profile/AiJobMatchSection";
import { NotesSection } from "./NotesSection";
import { useState, useMemo } from "react";
import { DownloadFileButton } from "../profile/DownloadFileButton";
import { MatchDetails } from "../automations/MatchDetails";
import type { JobMatchResponse } from "@/models/ai.schemas";

function JobDetails({ job }: { job: JobResponse }) {
  const { t } = useTranslations();
  const [aiSectionOpen, setAiSectionOpen] = useState(false);
  const router = useRouter();
  const goBack = () => router.back();

  const parsedMatchData = useMemo(() => {
    if (!job.matchData) return null;
    try {
      return JSON.parse(job.matchData) as JobMatchResponse;
    } catch {
      return null;
    }
  }, [job.matchData]);
  const getAiJobMatch = async () => {
    setAiSectionOpen(true);
  };
  const getJobType = (code: string) => {
    switch (code) {
      case "FT":
        return t("jobs.fullTime");
      case "PT":
        return t("jobs.partTime");
      case "C":
        return t("jobs.contract");
      default:
        return code;
    }
  };
  return (
    <>
      <div className="flex justify-between">
        <Button title={t("jobs.goBack")} size="sm" variant="outline" onClick={goBack}>
          <ArrowLeft />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 cursor-pointer"
          onClick={getAiJobMatch}
          // disabled={loading}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            {t("jobs.matchWithAi")}
          </span>
        </Button>
      </div>
      {job?.id && (
        <Card className="col-span-3">
          <CardHeader className="flex-row justify-between relative">
            <div>
              {job?.Company?.label}
              <CardTitle>{job?.JobTitle?.label}</CardTitle>
              <CardDescription>
                {job?.Location?.label} - {getJobType(job?.jobType)}
              </CardDescription>
            </div>
            <div>
              {job?.Resume && job?.Resume?.File && job.Resume?.File?.filePath
                ? DownloadFileButton(
                    job?.Resume?.File?.filePath,
                    job?.Resume?.title,
                    job?.Resume?.File?.fileName,
                  )
                : null}
            </div>
          </CardHeader>
          <h3 className="ml-4">
            {new Date() > job.dueDate && job.Status?.value === "draft" ? (
              <Badge className="bg-red-500">{t("jobs.expired")}</Badge>
            ) : (
              <Badge
                className={cn(
                  "w-[70px] justify-center",
                  job.Status?.value === "applied" && "bg-cyan-500",
                  job.Status?.value === "interview" && "bg-green-500",
                )}
              >
                {job.Status?.label}
              </Badge>
            )}
            <span className="ml-2">
              {job?.appliedDate ? format(new Date(job?.appliedDate), "PP") : ""}
            </span>
          </h3>
          {job.tags && job.tags.length > 0 && (
            <div className="my-3 ml-4 flex flex-wrap gap-1">
              {job.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}
          {job.jobUrl && (
            <div className="my-3 ml-4">
              <span className="font-semibold mr-2">{t("jobs.jobUrl")}:</span>
              <a
                href={formatUrl(job.jobUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {job.jobUrl}
              </a>
            </div>
          )}
          <div className="my-4 ml-4">
            <TipTapContentViewer content={job?.description} />
          </div>
          <NotesSection jobId={job.id} />
          {parsedMatchData && (
            <div className="mx-4 mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t("jobs.aiMatchAnalysis")}
                {job.matchScore && (
                  <Badge variant="default">{job.matchScore}{t("jobs.percentMatch")}</Badge>
                )}
              </h4>
              <MatchDetails matchData={parsedMatchData} />
            </div>
          )}
          <CardFooter></CardFooter>
        </Card>
      )}
      {
        <AiJobMatchSection
          jobId={job?.id}
          aISectionOpen={aiSectionOpen}
          triggerChange={setAiSectionOpen}
        />
      }
    </>
  );
}

export default JobDetails;
