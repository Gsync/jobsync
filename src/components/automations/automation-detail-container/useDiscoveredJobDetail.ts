"use client";

import { useState } from "react";
import { getDiscoveredJobById } from "@/actions/automation.actions";
import type { DiscoveredJob } from "@/models/automation.model";
import type { JobMatchData } from "@/models/ai.schemas";

// Opens the discovered-job detail sheet, re-fetching the full record (list rows
// omit the description and match data) and falling back to the list row.
export function useDiscoveredJobDetail() {
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [selectedJobMatchData, setSelectedJobMatchData] =
    useState<JobMatchData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewJobDetails = async (job: DiscoveredJob) => {
    const result = await getDiscoveredJobById(job.id);
    if (result.success && result.data) {
      setSelectedJob(result.data);
      setSelectedJobMatchData(
        result.data.parsedMatchData as JobMatchData | null,
      );
      setDetailOpen(true);
    } else {
      setSelectedJob(job);
      setSelectedJobMatchData(null);
      setDetailOpen(true);
    }
  };

  return {
    selectedJob,
    selectedJobMatchData,
    detailOpen,
    setDetailOpen,
    handleViewJobDetails,
  };
}
