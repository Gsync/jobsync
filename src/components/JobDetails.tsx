"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getJobDetails } from "@/actions/job.actions";
import { DialogDescription } from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

function JobDetails({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<any>({});
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false, // Make it non-editable if you only want to display content
  });
  useEffect(() => {
    const getJob = async (id: string) => {
      const res = await getJobDetails(id);
      editor?.commands.setContent(res.description);
      setJob(res);
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

          <h3>Applied: {format(new Date(job?.appliedDate), "PP")}</h3>
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
