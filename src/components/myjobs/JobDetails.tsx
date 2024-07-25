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
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

function JobDetails({ job }: { job: JobResponse }) {
  const router = useRouter();
  const goBack = () => router.back();
  return (
    <>
      <Button title="Go Back" size="sm" variant="outline" onClick={goBack}>
        <ArrowLeft />
      </Button>
      {job?.id && (
        <Card className="col-span-3">
          <CardHeader>
            {job?.Company?.label}
            <CardTitle>{job?.JobTitle?.label}</CardTitle>
            <CardDescription>
              {job?.Location?.label} - {job?.jobType}
            </CardDescription>
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
              {format(new Date(job?.appliedDate), "PP")}
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
    </>
  );
}

export default JobDetails;
