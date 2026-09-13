"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Briefcase } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CircularScore } from "@/components/CircularScore";
import { StatusBadge } from "@/components/StatusBadge";
import { JobTabEmptyState } from "@/components/myjobs/job-details/JobTabEmptyState";
import { getJobStatusBadgeColor } from "@/lib/badge-colors";
import type { CompanyJobRow } from "@/models/companyDetails.model";

type CompanyJobsTabProps = {
  jobs: CompanyJobRow[];
};

// Read-only on purpose: every job action already lives on the job's own page
export function CompanyJobsTab({ jobs }: CompanyJobsTabProps) {
  if (jobs.length === 0) {
    return (
      <JobTabEmptyState
        icon={Briefcase}
        title="No jobs at this company yet"
        description="Jobs you add or accept from an automation for this company show up here."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Location</TableHead>
          <TableHead className="hidden md:table-cell">Applied</TableHead>
          <TableHead>Match</TableHead>
          <TableHead className="hidden md:table-cell">Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">
              <Link
                href={`/dashboard/myjobs/${job.id}`}
                className="hover:underline underline-offset-4"
              >
                {job.JobTitle.label}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge
                label={job.Status.label}
                color={getJobStatusBadgeColor(job.Status.value)}
              />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {job.Location?.label ?? "—"}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {job.appliedDate
                ? format(new Date(job.appliedDate), "PP")
                : "Not applied"}
            </TableCell>
            <TableCell>
              {job.matchScore != null ? (
                <CircularScore score={job.matchScore} size="sm" />
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {job.JobSource?.label ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
