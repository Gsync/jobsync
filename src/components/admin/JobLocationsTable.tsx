"use client";
import { useState } from "react";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { JobLocation } from "@/models/job.model";
import { Trash2 } from "lucide-react";
import { AlertDialog } from "@/models/alertDialog.model";
import { toast } from "../ui/use-toast";
import { deleteJobLocationById } from "@/actions/jobLocation.actions";
import { useTranslations } from "@/i18n";

type JobLocationsTableProps = {
  jobLocations: JobLocation[];
  reloadJobLocations: () => void;
};

function JobLocationsTable({
  jobLocations,
  reloadJobLocations,
}: JobLocationsTableProps) {
  const { t } = useTranslations();
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });
  const onDeleteJobLocation = (location: JobLocation) => {
    if (location._count?.jobsApplied! > 0) {
      setAlert({
        openState: true,
        title: "Applied jobs exist!",
        description:
          "Associated jobs applied must be 0 to be able to delete this job location",
        deleteAction: false,
      });
    } else {
      setAlert({
        openState: true,
        deleteAction: true,
        itemId: location.id,
      });
    }
  };
  const deleteJobLocation = async (locationId: string) => {
    if (locationId) {
      const { success, message } = await deleteJobLocationById(locationId);
      if (success) {
        toast({
          variant: "success",
          description: `Job location has been deleted successfully`,
        });
        reloadJobLocations();
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
            <TableHead>Location</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label={t("common.delete")}
                    onClick={() => onDeleteJobLocation(location)}
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
        pageTitle="location"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteJobLocation(alert.itemId!)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default JobLocationsTable;
