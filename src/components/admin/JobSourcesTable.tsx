"use client";
import { useState } from "react";
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
import { JobSource } from "@/models/job.model";
import { MoreHorizontal, Trash } from "lucide-react";
import { AlertDialog } from "@/models/alertDialog.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { deleteJobSourceById } from "@/actions/jobSource.actions";
import { toast } from "../ui/use-toast";
import { useTranslations } from "@/i18n";

type JobSourcesTableProps = {
  jobSources: JobSource[];
  reloadJobSources: () => void;
};

function JobSourcesTable({
  jobSources,
  reloadJobSources,
}: JobSourcesTableProps) {
  const { t } = useTranslations();
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteJobSource = (source: JobSource) => {
    if (source._count?.jobsApplied! > 0) {
      setAlert({
        openState: true,
        title: t("admin.appliedJobsExist"),
        description: t("admin.appliedJobsExistDesc"),
        deleteAction: false,
      });
    } else {
      setAlert({
        openState: true,
        deleteAction: true,
        itemId: source.id,
      });
    }
  };

  const deleteJobSource = async (sourceId: string) => {
    if (sourceId) {
      const { success, message } = await deleteJobSourceById(sourceId);
      if (success) {
        toast({
          variant: "success",
          description: t("admin.jobSourceDeleted"),
        });
        reloadJobSources();
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
            <TableHead>{t("admin.source")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("admin.value")}</TableHead>
            <TableHead>{t("admin.jobsApplied")}</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobSources.map((source: JobSource) => {
            return (
              <TableRow key={source.id}>
                <TableCell className="font-medium">{source.label}</TableCell>
                <TableCell className="font-medium hidden sm:table-cell">
                  {source.value}
                </TableCell>
                <TableCell className="font-medium">
                  {source._count?.jobsApplied}
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
                      <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteJobSource(source)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        {t("common.delete")}
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
        pageTitle="source"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteJobSource(alert.itemId!)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default JobSourcesTable;
