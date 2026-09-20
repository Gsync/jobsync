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
import { JobStageTypeRef } from "@/models/jobStage.model";
import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash } from "lucide-react";
import { AlertDialog } from "@/models/alertDialog.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { StatusBadge } from "../StatusBadge";
import { getJobStatusBadgeColor } from "@/lib/badge-colors";
import {
  deleteJobStageTypeById,
  updateJobStageType,
} from "@/actions/jobStageType.actions";
import { toastSuccess, toastError } from "@/lib/toast";

type JobStagesTableProps = {
  types: JobStageTypeRef[];
  reloadTypes: () => void;
  onEdit: (type: JobStageTypeRef) => void;
};

function JobStagesTable({ types, reloadTypes, onEdit }: JobStagesTableProps) {
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteType = (type: JobStageTypeRef) => {
    const stages = type._count?.stages ?? 0;
    if (stages > 0) {
      setAlert({
        openState: true,
        title: "Stage type is in use!",
        description: `This stage type is used by ${stages} job stage${
          stages === 1 ? "" : "s"
        }. Change or remove those stages before deleting the type.`,
        deleteAction: false,
      });
    } else {
      setAlert({ openState: true, deleteAction: true, itemId: type.id });
    }
  };

  const deleteType = async (typeId: string) => {
    if (typeId) {
      const { success, message } = await deleteJobStageTypeById(typeId);
      if (success) {
        toastSuccess("Stage type has been deleted successfully");
        reloadTypes();
      } else {
        toastError(message);
      }
    }
  };

  // Swap sortOrder with the adjacent row rather than renumbering the list:
  // a drag-and-drop reorder would need a new dependency.
  const move = async (index: number, direction: -1 | 1) => {
    const type = types[index];
    const neighbour = types[index + direction];
    if (!neighbour) return;

    const results = await Promise.all([
      updateJobStageType(
        type.id,
        type.label,
        type.statusId,
        neighbour.sortOrder,
      ),
      updateJobStageType(
        neighbour.id,
        neighbour.label,
        neighbour.statusId,
        type.sortOrder,
      ),
    ]);
    const failed = results.find((res) => !res?.success);
    if (failed) {
      toastError(failed.message);
    }
    reloadTypes();
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead>Parent Status</TableHead>
            <TableHead className="hidden sm:table-cell">Order</TableHead>
            <TableHead>Stages</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type: JobStageTypeRef, index: number) => {
            return (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.label}</TableCell>
                <TableCell>
                  {type.Status && (
                    <StatusBadge
                      label={type.Status.label}
                      color={getJobStatusBadgeColor(type.Status.value)}
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium hidden sm:table-cell">
                  {type.sortOrder}
                </TableCell>
                <TableCell className="font-medium">
                  {type._count?.stages ?? 0}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onEdit(type)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Move Up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={index === types.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Move Down
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteType(type)}
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
        pageTitle="stage type"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteType(alert.itemId!)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default JobStagesTable;
