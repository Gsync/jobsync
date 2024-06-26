"use client";
import { FilePenLine, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Resume } from "@/models/profile.model";
import { format } from "date-fns";
import Link from "next/link";

type ResumeTableProps = {
  resumes: Resume[];
  currentPage: number;
  totalPages: number;
  totalResumes: number;
  recordsPerPage: number;
  //   onPageChange: (n: number) => void;
  //   editCompany: (id: string) => void;
};

function ResumeTable({
  resumes,
  currentPage,
  totalPages,
  totalResumes,
  recordsPerPage,
}: //   onPageChange,
//   editCompany,
ResumeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resume Title</TableHead>
          <TableHead>Created</TableHead>
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
                    <Link href={`/dashboard/profile/resume/${resume.id}`}>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => ""}
                      >
                        <FilePenLine className="mr-2 h-4 w-4" />
                        View/Edit Resume
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => ""}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Resume Title
                    </DropdownMenuItem>
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
