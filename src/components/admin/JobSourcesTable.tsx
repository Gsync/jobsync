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

type JobSourcesTableProps = {
  jobSources: JobSource[];
  reloadJobSources: () => void;
};

function JobSourcesTable({
  jobSources,
  reloadJobSources,
}: JobSourcesTableProps) {
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteJobSource = (source: JobSource) => {
    if (source._count?.jobsApplied! > 0) {
      setAlert({
        openState: true,
        title: "Applied jobs exist!",
        description:
          "Associated jobs applied must be 0 to be able to delete this job source",
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
          description: `Job source has been deleted successfully`,
        });
        reloadJobSources();
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
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
            <TableHead>Source</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>Actions</TableHead>
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
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteJobSource(source)}
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
