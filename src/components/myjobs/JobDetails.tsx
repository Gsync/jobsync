"use client";
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
import { useState } from "react";
import { DownloadFileButton } from "../profile/DownloadFileButton";

function JobDetails({ job }: { job: JobResponse }) {
  const [aiSectionOpen, setAiSectionOpen] = useState(false);
  const router = useRouter();
  const goBack = () => router.back();
  const getAiJobMatch = async () => {
    setAiSectionOpen(true);
  };
  const getJobType = (code: string) => {
    switch (code) {
      case "FT":
        return "Full-time";
      case "PT":
        return "Part-time";
      case "C":
        return "Contract";
      default:
        return "Unknown";
    }
  };
  return (
    <>
      <div className="flex justify-between">
        <Button title="Go Back" size="sm" variant="outline" onClick={goBack}>
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
            Match with AI
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
                    job?.Resume?.File?.fileName
                  )
                : null}
            </div>
          </CardHeader>
          <h3 className="ml-4">
            {new Date() > job.dueDate && job.Status?.value === "draft" ? (
              <Badge className="bg-red-500">Expired</Badge>
            ) : (
              <Badge
                className={cn(
                  "w-[70px] justify-center",
                  job.Status?.value === "applied" && "bg-cyan-500",
                  job.Status?.value === "interview" && "bg-green-500"
                )}
              >
                {job.Status?.label}
              </Badge>
            )}
            <span className="ml-2">
              {job?.appliedDate ? format(new Date(job?.appliedDate), "PP") : ""}
            </span>
          </h3>
          {job.jobUrl && (
            <div className="my-3 ml-4">
              <span className="font-semibold mr-2">Job URL:</span>
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
