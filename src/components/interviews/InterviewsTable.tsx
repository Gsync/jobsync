"use client";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import InterviewRow from "./InterviewRow";
import type { InterviewRow as InterviewRowType } from "@/models/interview.model";

type InterviewsTableProps = {
  interviews: InterviewRowType[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (interview: InterviewRowType) => void;
  onChanged: () => void;
};

function InterviewsTable({
  interviews,
  expandedId,
  onToggle,
  onEdit,
  onChanged,
}: InterviewsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <span className="sr-only">Expand</span>
          </TableHead>
          <TableHead>When</TableHead>
          <TableHead>Job</TableHead>
          <TableHead>Round</TableHead>
          <TableHead className="hidden md:table-cell">Format</TableHead>
          <TableHead className="hidden lg:table-cell">Interviewers</TableHead>
          <TableHead className="hidden sm:table-cell">Prep</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interviews.map((interview) => (
          <InterviewRow
            key={interview.id}
            interview={interview}
            expanded={expandedId === interview.id}
            onToggle={() => onToggle(interview.id)}
            onEdit={() => onEdit(interview)}
            onOutcomeSaved={onChanged}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export default InterviewsTable;
