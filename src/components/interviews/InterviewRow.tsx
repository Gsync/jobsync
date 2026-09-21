"use client";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Phone,
  Video,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { TableCell, TableRow } from "../ui/table";
import {
  durationLabel,
  formatIconKind,
  formatText,
  interviewerSummary,
  outcomeLabel,
  outcomeTone,
  prepSummary,
  whenParts,
} from "./interviewDisplay";
import type { InterviewRow as InterviewRowType } from "@/models/interview.model";

const FORMAT_ICONS = { video: Video, phone: Phone, location: MapPin };

type InterviewRowProps = {
  interview: InterviewRowType;
  expanded: boolean;
  onToggle: () => void;
};

function InterviewRow({ interview, expanded, onToggle }: InterviewRowProps) {
  const when = whenParts(interview.occurredAt);
  const outcome = outcomeLabel(interview.occurredAt, interview.outcome);
  const FormatIcon = FORMAT_ICONS[formatIconKind(interview.format)];
  const duration = durationLabel(interview.durationMins);
  const title = interview.Job.JobTitle.label;

  return (
    <TableRow>
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
      <TableCell>
        <div className="font-medium">{when.day}</div>
        {when.time && (
          <div className="text-xs text-muted-foreground">{when.time}</div>
        )}
      </TableCell>
      <TableCell>
        <Link
          href={`/dashboard/myjobs/${interview.Job.id}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {title}
        </Link>
        <div className="text-xs text-muted-foreground">
          {interview.Job.Company.label}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{interview.StageType.label}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <FormatIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{formatText(interview.format, interview.location)}</span>
        </div>
        {duration && (
          <div className="text-xs text-muted-foreground">{duration}</div>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {interviewerSummary(interview.interviewers)}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {prepSummary(interview.prepQuestions)}
      </TableCell>
      <TableCell>
        <Badge variant={outcomeTone(outcome)}>{outcome}</Badge>
      </TableCell>
      <TableCell>
        <span className="sr-only">Actions</span>
      </TableCell>
    </TableRow>
  );
}

export default InterviewRow;
