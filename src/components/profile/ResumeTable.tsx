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
import { Button, buttonVariants } from "../ui/button";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { toast } from "../ui/use-toast";
import { deleteResumeById } from "@/actions/profile.actions";

type ResumeTableProps = {
  resumes: Resume[];
  currentPage: number;
  totalPages: number;
  totalResumes: number;
  recordsPerPage: number;
  //   onPageChange: (n: number) => void;
  editResume: (resume: Resume) => void;
  reloadResumes: () => void;
};

function ResumeTable({
  resumes,
  currentPage,
  totalPages,
  totalResumes,
  recordsPerPage,
  editResume,
  reloadResumes,
}: //   onPageChange,
ResumeTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [resumeIdToDelete, setResumeIdToDelete] = useState<string>();
  const onDeleteResume = useMemo(
    () => (resumeId: string | undefined) => {
      if (!resumeId) return;
      setAlertOpen(true);
      setResumeIdToDelete(resumeId);
    },
    []
  );

  const deleteResume = async (resumeId: string | undefined) => {
    if (!resumeId) return;
    const { success, message } = await deleteResumeById(resumeId);
    if (success) {
      toast({
        variant: "success",
        description: `Resume has been deleted successfully`,
      });
      reloadResumes();
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  };
  return (
    <>
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
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        data-testid="resume-actions-menu-btn"
                      >
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
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteResume(resume.id)}
                      >
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
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this resume?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete and
              remove data from server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => deleteResume(resumeIdToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ResumeTable;
