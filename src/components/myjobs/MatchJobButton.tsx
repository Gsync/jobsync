"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "../ui/button";

// Shown in place of the score when a job has none. The match flag is read by
// useAutoMatch on the details page, which fires the AI match on arrival.
export function MatchJobButton({ jobId }: { jobId: string }) {
  return (
    <Button asChild size="sm" variant="outline" className="shrink-0">
      <Link href={`/dashboard/myjobs/${jobId}?tab=match&match=1`}>
        <Sparkles className="h-3.5 w-3.5 mr-1" />
        Match
      </Link>
    </Button>
  );
}
