"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { JobTitle } from "@/models/job.model";
import { Trash2 } from "lucide-react";
import { AlertDialog } from "@/models/alertDialog.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { deleteJobTitleById } from "@/actions/jobtitle.actions";
import { toast } from "../ui/use-toast";
import { useTranslations } from "@/i18n";

type JobTitlesTableProps = {
  jobTitles: JobTitle[];
  reloadJobTitles: () => void;
};

function JobTitlesTable({ jobTitles, reloadJobTitles }: JobTitlesTableProps) {
  const { t } = useTranslations();
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteJobTitle = (title: JobTitle) => {
    if (title._count?.jobs! > 0) {
      setAlert({
        openState: true,
        title: "Applied jobs exist!",
        description:
          "Associated jobs applied must be 0 to be able to delete this job title",
        deleteAction: false,
      });
    } else {
      setAlert({
        openState: true,
        deleteAction: true,
        itemId: title.id,
      });
    }
  };
  const deleteJobTitle = async (titleId: string) => {
    if (titleId) {
      const { success, message } = await deleteJobTitleById(titleId);
      if (success) {
        toast({
          variant: "success",
          description: `Job title has been deleted successfully`,
        });
        reloadJobTitles();
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: message,
        });
      }
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Title</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label={t("common.delete")}
                    onClick={() => onDeleteJobTitle(title)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">{t("common.delete")}</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="title"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteJobTitle(alert.itemId!)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default JobTitlesTable;
