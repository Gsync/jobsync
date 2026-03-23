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
import { Resume } from "@/models/profile.model";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "../ui/button";
import { useMemo, useState } from "react";
import { toast } from "../ui/use-toast";
import { deleteResumeById } from "@/actions/profile.actions";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { useTranslations } from "@/i18n";

type ResumeTableProps = {
  resumes: Resume[];
  editResume: (resume: Resume) => void;
  reloadResumes: () => void;
};

function ResumeTable({ resumes, editResume, reloadResumes }: ResumeTableProps) {
  const { t } = useTranslations();
  const [alertOpen, setAlertOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<Resume>();
  const onDeleteResume = useMemo(
    () => (resume: Resume) => {
      if (!resume.id) return;
      setAlertOpen(true);
      setResumeToDelete(resume);
    },
    []
  );

  const deleteResume = async (resume: Resume) => {
    if (!resume.id) return;
    if (resume._count?.Job! > 0)
      return toast({
        variant: "destructive",
        title: t("profile.error"),
        description: t("profile.jobsMustBeZero"),
      });
    const { success, message } = await deleteResumeById(
      resume.id,
      resume.FileId
    );
    if (success) {
      toast({
        variant: "success",
        description: t("profile.resumeDeleted"),
      });
      reloadResumes();
    } else {
      toast({
        variant: "destructive",
        title: t("profile.error"),
        description: message,
      });
    }
  };
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("profile.resumeTitle")}</TableHead>
            <TableHead>{t("profile.created")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("profile.updated")}</TableHead>
            <TableHead>{t("profile.jobsCount")}</TableHead>
            <TableHead>{t("profile.actions")}</TableHead>
            <TableHead>
              <span className="sr-only">{t("profile.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resumes.map((resume: Resume) => {
            return (
              <TableRow key={resume.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/profile/resume/${resume.id}`}
                    className="flex items-center"
                  >
                    {resume.title}
                    {resume.FileId ? (
                      <Paperclip className="h-3.5 w-3.5 ml-1" />
                    ) : null}
                  </Link>
                </TableCell>
                <TableCell>
                  {resume.createdAt && format(resume.createdAt, "PP")}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {resume.updatedAt && format(resume.updatedAt, "PP")}
                </TableCell>
                <TableCell>{resume._count?.Job}</TableCell>
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
                        <span className="sr-only">{t("profile.toggleMenu")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("profile.actions")}</DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => editResume(resume)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("profile.editResumeTitle")}
                      </DropdownMenuItem>
                      <Link href={`/dashboard/profile/resume/${resume.id}`}>
                        <DropdownMenuItem className="cursor-pointer">
                          <FilePenLine className="mr-2 h-4 w-4" />
                          {t("profile.viewEditResume")}
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteResume(resume)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        {t("profile.delete")}
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
        pageTitle={t("profile.resume")}
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteResume(resumeToDelete!)}
      />
    </>
  );
}

export default ResumeTable;
