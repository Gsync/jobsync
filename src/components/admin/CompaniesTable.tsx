"use client";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Company } from "@/models/job.model";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCompanyById } from "@/actions/company.actions";
import { toast } from "../ui/use-toast";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { AlertDialog } from "@/models/alertDialog.model";
import { useTranslations } from "@/i18n";

type CompaniesTableProps = {
  companies: Company[];
  reloadCompanies: () => void;
  editCompany: (id: string) => void;
};

function CompaniesTable({
  companies,
  reloadCompanies,
  editCompany,
}: CompaniesTableProps) {
  const { t } = useTranslations();
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteCompany = (company: Company) => {
    if (company._count?.jobsApplied! > 0) {
      setAlert({
        openState: true,
        title: "Applied jobs exist!",
        description:
          "Associated jobs applied must be 0 to be able to delete this company",
        deleteAction: false,
      });
    } else {
      setAlert({
        openState: true,
        deleteAction: true,
        itemId: company.id,
      });
    }
  };

  const deleteCompany = async (companyId: string | undefined) => {
    if (companyId) {
      const { data: res, success, message } = await deleteCompanyById(companyId);
      if (success) {
        toast({
          variant: "success",
          description: `Company has been deleted successfully`,
        });
        reloadCompanies();
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
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Company Logo</span>
            </TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company: Company) => {
            return (
              <TableRow key={company.id}>
                <TableCell className="hidden sm:table-cell">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Company logo"
                    className="w-8 h-8 rounded-md object-cover"
                    src={company.logoUrl || "/images/jobsync-logo.svg"}
                  />
                </TableCell>
                <TableCell className="font-medium">{company.label}</TableCell>
                <TableCell className="font-medium hidden sm:table-cell">
                  {company.value}
                </TableCell>
                <TableCell className="font-medium">
                  {company._count?.jobsApplied}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("common.edit")}
                      onClick={() => editCompany(company.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">{t("common.edit")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label={t("common.delete")}
                      onClick={() => onDeleteCompany(company)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">{t("common.delete")}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="company"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteCompany(alert.itemId)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default CompaniesTable;
