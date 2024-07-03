"use client";
import { FilePenLine, MoreHorizontal, Pencil, Trash } from "lucide-react";
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
import { Resume } from "@/models/profile.model";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "../ui/button";

type ResumeTableProps = {
  resumes: Resume[];
  currentPage: number;
  totalPages: number;
  totalResumes: number;
  recordsPerPage: number;
  //   onPageChange: (n: number) => void;
  editResume: (resume: Resume) => void;
};

function ResumeTable({
  resumes,
  currentPage,
  totalPages,
  totalResumes,
  recordsPerPage,
  editResume,
}: //   onPageChange,
ResumeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resume Title</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="hidden md:table-cell">Updated</TableHead>
          <TableHead>Actions</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resumes.map((resume: Resume) => {
          return (
            <TableRow key={resume.id}>
              <TableCell className="font-medium">
                <Link href={`/dashboard/profile/resume/${resume.id}`}>
                  {resume.title}
                </Link>
              </TableCell>
              <TableCell>
                {resume.createdAt && format(resume.createdAt, "PP")}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {resume.updatedAt && format(resume.updatedAt, "PP")}
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
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => editResume(resume)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Resume Title
                    </DropdownMenuItem>
                    <Link href={`/dashboard/profile/resume/${resume.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <FilePenLine className="mr-2 h-4 w-4" />
                        View/Edit Resume
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem className="text-red-600 cursor-pointer">
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default ResumeTable;
