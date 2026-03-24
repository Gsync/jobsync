import { auth } from "@/auth";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { PassThrough } from "node:stream";
import { getJobsIterator } from "@/actions/job.actions";
import { formatISODate } from "@/i18n";

const FIELDS: string[] = [
  "index",
  "createdAt",
  "applied",
  "appliedDate",
  "Company",
  "JobTitle",
  "jobType",
  "Location",
  "JobSource",
  "Status",
];

const extractLabel = (field: { label?: string } | undefined): string => {
  return field?.label || "N/A";
};

const mapJobType = (type: string | undefined): string => {
  switch (type) {
    case "FT":
      return "Full Time";
    case "PT":
      return "Part Time";
    case "C":
      return "Contract";
    default:
      return "Unknown";
  }
};

const transformJobData = (
  job: Record<string, any>,
  index: number
): Record<string, any> => {
  return {
    index: index + 1,
    createdAt: job.createdAt
      ? formatISODate(new Date(job.createdAt))
      : "N/A",
    applied: job.applied ? "Yes" : "No",
    appliedDate: job.appliedDate
      ? formatISODate(new Date(job.appliedDate))
      : "N/A",
    Company: extractLabel(job.Company),
    JobTitle: extractLabel(job.JobTitle),
    jobType: mapJobType(job.jobType),
    Location: extractLabel(job.Location),
    JobSource: extractLabel(job.JobSource),
    Status: extractLabel(job.Status),
  };
};

export const POST = async () => {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const passThrough = new PassThrough();
  let isFirstChunk = true;
  let hasError = false;

  (async () => {
    try {
      let recordIndex = 0;
      for await (const chunk of getJobsIterator()) {
        if (hasError) break;
        const transformedData = chunk.map((job, idx) =>
          transformJobData(job, recordIndex + idx)
        );
        recordIndex += chunk.length;
        const csv = Papa.unparse(
          { fields: FIELDS, data: transformedData },
          {
            header: isFirstChunk,
          }
        );
        passThrough.write((isFirstChunk ? "" : "\n") + csv);
        isFirstChunk = false;
      }
    } catch (error) {
      hasError = true;
      console.error("Error streaming CSV:", error);
      passThrough.write(`\nError: ${error instanceof Error ? error.message : "Export failed"}\n`);
      passThrough.end();
    } finally {
      passThrough.end();
    }
  })();

  return new NextResponse(passThrough as any, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="jobs.csv"',
    },
  });
};
