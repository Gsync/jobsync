"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InterviewFilterOption } from "@/models/interview.model";

// Select cannot hold an empty-string value, so all-of-them gets a sentinel
const ALL = "all";

type Props = {
  rounds: InterviewFilterOption[];
  companies: InterviewFilterOption[];
  stageTypeId?: string;
  companyId?: string;
  onRoundChange: (id?: string) => void;
  onCompanyChange: (id?: string) => void;
};

export function InterviewFilters({
  rounds,
  companies,
  stageTypeId,
  companyId,
  onRoundChange,
  onCompanyChange,
}: Props) {
  return (
    <>
      <Select
        value={stageTypeId ?? ALL}
        onValueChange={(v) => onRoundChange(v === ALL ? undefined : v)}
      >
        <SelectTrigger aria-label="Filter by round" className="h-8 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All rounds</SelectItem>
          {rounds.map((round) => (
            <SelectItem key={round.id} value={round.id}>
              {round.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={companyId ?? ALL}
        onValueChange={(v) => onCompanyChange(v === ALL ? undefined : v)}
      >
        <SelectTrigger aria-label="Filter by company" className="h-8 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All companies</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
