"use client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { getJobDetails } from "@/actions/job.actions";
import { format } from "date-fns";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Badge } from "../ui/badge";
import { cn, formatUrl } from "@/lib/utils";
import { JobResponse } from "@/models/job.model";
import { toast } from "../ui/use-toast";

function JobDetails({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobResponse>();
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false, // Make it non-editable if you only want to display content
  });
  useEffect(() => {
    const getJob = async (id: string) => {
      const { job, success, message } = await getJobDetails(id);
      if (!success) {
        return toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
      editor?.commands.setContent(job.description);
      setJob(job);
    };
    getJob(jobId);
  }, [jobId, editor]);

  return (
    <>
      {job?.id ? (
        <div className="col-span-3">
          <DialogHeader className="mb-4">
            <DialogDescription>{job?.Company?.label}</DialogDescription>
            <DialogTitle>{job?.JobTitle?.label}</DialogTitle>
            <DialogDescription>
              {job?.Location?.label} - {job?.jobType}
            </DialogDescription>
          </DialogHeader>
          <h3>
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
          {job.jobUrl ? (
            <div className="my-3">
              <span className="font-semibold mr-2">Job URL:</span>
              <a
                href={formatUrl(job.jobUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {job.jobUrl}
              </a>
            </div>
          ) : null}
          <div className="my-4">
            <EditorContent editor={editor} />
          </div>
          {/* <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{JSON.stringify(job, null, 2)}</code>
          </pre> */}
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" className="mt-2 md:mt-0 w-full">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      ) : null}
    </>
  );
}

export default JobDetails;
