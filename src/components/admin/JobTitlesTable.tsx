"use client";
import { Button } from "../ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { JobTitle } from "@/models/job.model";
import { MoreHorizontal, Pencil } from "lucide-react";
import { TablePagination } from "../TablePagination";

type JobTitlesTableProps = {
  jobTitles: JobTitle[];
  currentPage: number;
  totalPages: number;
  totalJobTitles: number;
  recordsPerPage: number;
  onPageChange: (n: number) => void;
};

function JobTitlesTable({
  jobTitles,
  currentPage,
  totalPages,
  totalJobTitles,
  recordsPerPage,
  onPageChange,
}: JobTitlesTableProps) {
  const startPostIndex = (currentPage - 1) * recordsPerPage + 1;
  const endPostIndex = Math.min(currentPage * recordsPerPage, totalJobTitles);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Title</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobTitles.map((title: JobTitle) => {
            return (
              <TableRow key={title.id}>
                <TableCell className="font-medium">{title.label}</TableCell>
                <TableCell className="font-medium hidden sm:table-cell">
                  {title.value}
                </TableCell>
                <TableCell className="font-medium">
                  {title._count?.jobs}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="text-xs text-muted-foreground">
        Showing{" "}
        <strong>
          {startPostIndex} to {endPostIndex}
        </strong>{" "}
        of
        <strong> {totalJobTitles}</strong> titles
      </div>
      {totalJobTitles > recordsPerPage && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

export default JobTitlesTable;
