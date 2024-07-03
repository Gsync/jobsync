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
import { JobLocation, JobTitle } from "@/models/job.model";
import { MoreHorizontal } from "lucide-react";
import { TablePagination } from "../TablePagination";

type JobLocationsTableProps = {
  jobLocations: JobLocation[];
  currentPage: number;
  totalPages: number;
  totalJobLocations: number;
  recordsPerPage: number;
  onPageChange: (n: number) => void;
};

function JobLocationsTable({
  jobLocations,
  currentPage,
  totalPages,
  totalJobLocations,
  recordsPerPage,
  onPageChange,
}: JobLocationsTableProps) {
  const startPostIndex = (currentPage - 1) * recordsPerPage + 1;
  const endPostIndex = Math.min(
    currentPage * recordsPerPage,
    totalJobLocations
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Location</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobLocations.map((location: JobLocation) => {
            return (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.label}</TableCell>
                <TableCell className="font-medium hidden sm:table-cell">
                  {location.value}
                </TableCell>
                <TableCell className="font-medium">
                  {location._count?.jobsApplied}
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
        <strong> {totalJobLocations}</strong> locations
      </div>
      {totalJobLocations > recordsPerPage ? (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}

export default JobLocationsTable;
