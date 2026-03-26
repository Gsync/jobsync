"use client";
import {
  FilePenLine,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Trash,
} from "lucide-react";
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
import { ProfileDocument } from "@/models/profile.model";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "../ui/button";
import { useMemo, useState } from "react";
import { toast } from "../ui/use-toast";
import { deleteResumeById } from "@/actions/profile.actions";
import { deleteCoverLetterById } from "@/actions/coverLetter.actions";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { Badge } from "../ui/badge";

type DocumentTableProps = {
  documents: ProfileDocument[];
  editResume: (doc: ProfileDocument) => void;
  editCoverLetter: (doc: ProfileDocument) => void;
  reloadDocuments: () => void;
};

function DocumentTable({
  documents,
  editResume,
  editCoverLetter,
  reloadDocuments,
}: DocumentTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<ProfileDocument>();
  const onDeleteDocument = useMemo(
    () => (doc: ProfileDocument) => {
      if (!doc.id) return;
      setAlertOpen(true);
      setDocumentToDelete(doc);
    },
    []
  );

  const deleteDocument = async (doc: ProfileDocument) => {
    if (!doc.id) return;
    if (doc.jobCount > 0) {
      const label =
        doc.type === "resume" ? "resume" : "cover letter";
      return toast({
        variant: "destructive",
        title: "Error!",
        description: `Number of jobs using ${label} must be 0!`,
      });
    }

    const { success, message } =
      doc.type === "resume"
        ? await deleteResumeById(doc.id, doc.FileId)
        : await deleteCoverLetterById(doc.id);

    if (success) {
      const label =
        doc.type === "resume" ? "Resume" : "Cover letter";
      toast({
        variant: "success",
        description: `${label} has been deleted successfully`,
      });
      reloadDocuments();
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
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="hidden md:table-cell">Updated</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const isResume = doc.type === "resume";
            return (
              <TableRow key={`${doc.type}-${doc.id}`}>
                <TableCell className="font-medium">
                  {isResume ? (
                    <Link
                      href={`/dashboard/profile/resume/${doc.id}`}
                      className="flex items-center"
                    >
                      {doc.title}
                      {doc.FileId ? (
                        <Paperclip className="h-3.5 w-3.5 ml-1" />
                      ) : null}
                    </Link>
                  ) : (
                    <button
                      className="text-left hover:underline"
                      onClick={() => editCoverLetter(doc)}
                    >
                      {doc.title}
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={isResume ? "default" : "secondary"}
                  >
                    {isResume ? "Resume" : "Cover Letter"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {doc.createdAt && format(doc.createdAt, "PP")}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {doc.updatedAt && format(doc.updatedAt, "PP")}
                </TableCell>
                <TableCell>{doc.jobCount}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        data-testid="document-actions-menu-btn"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {isResume ? (
                        <>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => editResume(doc)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Resume Title
                          </DropdownMenuItem>
                          <Link
                            href={`/dashboard/profile/resume/${doc.id}`}
                          >
                            <DropdownMenuItem className="cursor-pointer">
                              <FilePenLine className="mr-2 h-4 w-4" />
                              View/Edit Resume
                            </DropdownMenuItem>
                          </Link>
                        </>
                      ) : (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => editCoverLetter(doc)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Cover Letter
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteDocument(doc)}
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
      <DeleteAlertDialog
        pageTitle={
          documentToDelete?.type === "cover-letter"
            ? "cover letter"
            : "resume"
        }
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteDocument(documentToDelete!)}
      />
    </>
  );
}

export default DocumentTable;
