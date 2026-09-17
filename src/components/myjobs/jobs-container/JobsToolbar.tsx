"use client";
import { File, RefreshCw, X } from "lucide-react";
import { SearchInput as OsuiSearchInput } from "../../osui/inputs/search-input";
import { SelectFieldInput } from "../../osui/inputs/select-field-input";
import { SegmentedToggleButton } from "../../osui/buttons/segmented-toggle-button";
import { SoftPillButton } from "../../osui/buttons/soft-pill-button";
import { RecordsCount } from "../../RecordsCount";
import { AddJob } from "../AddJob";
import {
  Company,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobsViewMode,
  JobTitle,
  Tag,
} from "@/models/job.model";

// Presentational: the Applications card header on osui components —
///title/count, filter chips, segmented view toggle, search, filter,
// export and Add Job.
export function JobsToolbar({
  jobsCount,
  totalJobs,
  initialLoading,
  viewMode,
  onChangeViewMode,
  companyLabel,
  onClearCompanyFilter,
  titleLabel,
  onClearTitleFilter,
  locationLabel,
  onClearLocationFilter,
  sourceLabel,
  onClearSourceFilter,
  onReload,
  searchTerm,
  onSearchTermChange,
  filterKey,
  onFilterChange,
  onDownload,
  statuses,
  companies,
  titles,
  locations,
  sources,
  tags,
  editJob,
  resetEditJob,
  addJobInitialOpen,
  activeWorkspaceId,
}: {
  jobsCount: number;
  totalJobs: number;
  initialLoading: boolean;
  viewMode: JobsViewMode;
  onChangeViewMode: (mode: JobsViewMode) => void;
  companyLabel?: string | null;
  onClearCompanyFilter: () => void;
  titleLabel?: string | null;
  onClearTitleFilter: () => void;
  locationLabel?: string | null;
  onClearLocationFilter: () => void;
  sourceLabel?: string | null;
  onClearSourceFilter: () => void;
  onReload: () => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filterKey: string;
  onFilterChange: (filterBy: string) => void;
  onDownload: () => void;
  statuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  tags: Tag[];
  editJob: JobResponse | null;
  resetEditJob: () => void;
  addJobInitialOpen: boolean;
  activeWorkspaceId?: string | null;
}) {
  const chip = (label: string, onClear: () => void) => (
    <button
      key={label}
      onClick={onClear}
      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
    >
      {label}
      <X className="h-3.5 w-3.5 text-neutral-400" />
    </button>
  );
  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm font-semibold text-neutral-900">Applications</p>
        {!initialLoading && totalJobs > 0 && (
          <RecordsCount count={jobsCount} total={totalJobs} label="jobs" />
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <SegmentedToggleButton
          key={viewMode}
          options={["Table", "Cards"]}
          defaultIndex={viewMode === "cards" ? 1 : 0}
          // osui types onChange as an intersection with the div handler; the
          // (index, value) form is the documented usage.
          onChange={((_: number, value: string) =>
            onChangeViewMode(value === "Cards" ? "cards" : "table")) as never}
        />
        {companyLabel && chip(companyLabel, onClearCompanyFilter)}
        {titleLabel && chip(titleLabel, onClearTitleFilter)}
        {locationLabel && chip(locationLabel, onClearLocationFilter)}
        {sourceLabel && chip(sourceLabel, onClearSourceFilter)}
        <SoftPillButton
          size="sm"
          variant="light"
          disabled={initialLoading}
          title="Reload jobs"
          onClick={onReload}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${initialLoading ? "animate-spin" : ""}`} />
          <span className="sr-only">Reload jobs</span>
        </SoftPillButton>
        <OsuiSearchInput
          value={searchTerm}
          onChange={(v) => onSearchTermChange(v)}
          onClear={() => onSearchTermChange("")}
          placeholder="Search jobs..."
          label=""
        />
        <SelectFieldInput
          label=""
          placeholder="Filter"
          value={filterKey}
          onValueChange={onFilterChange}
          options={[
            { value: "none", label: "All (Except Dismissed)" },
            { value: "applied", label: "Applied" },
            { value: "interview", label: "Interview" },
            { value: "draft", label: "Draft" },
            { value: "rejected", label: "Rejected" },
            { value: "PT", label: "Part-time" },
            { value: "accepted", label: "Accepted (discovered)" },
            { value: "dismissed", label: "Dismissed (discovered)" },
          ]}
        />
        <SoftPillButton size="sm" variant="light" disabled={initialLoading} onClick={onDownload}>
          <File className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
        </SoftPillButton>
        <AddJob
          jobStatuses={statuses}
          companies={companies}
          jobTitles={titles}
          locations={locations}
          jobSources={sources}
          tags={tags}
          editJob={editJob}
          resetEditJob={resetEditJob}
          initialOpen={addJobInitialOpen}
          defaultWorkspaceId={activeWorkspaceId}
        />
      </div>
    </div>
  );
}
