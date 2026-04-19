"use client";
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
import { Company } from "@/models/job.model";
import { Briefcase, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { deleteCompanyById } from "@/actions/company.actions";
import { toast } from "../ui/use-toast";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { AlertDialog } from "@/models/alertDialog.model";

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
      const { res, success, message } = await deleteCompanyById(companyId);
      if (success) {
        toast({
          variant: "success",
          description: `Company has been deleted successfully`,
        });
        reloadCompanies();
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
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Company Logo</span>
            </TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead className="hidden sm:table-cell">Value</TableHead>
            <TableHead>Jobs Applied</TableHead>
            <TableHead>Rejected</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
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
                  {company._count?.jobsApplied ? (
                    <Link
                      href={`/dashboard/myjobs?company=${encodeURIComponent(company.value)}&applied=true`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {company._count.jobsApplied}
                    </Link>
                  ) : (
                    (company._count?.jobsApplied ?? 0)
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {company._count?.jobsRejected ?? 0}
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
                      {company._count?.jobsApplied ? (
                        <DropdownMenuItem className="cursor-pointer" asChild>
                          <Link
                            href={`/dashboard/myjobs?company=${encodeURIComponent(company.value)}&applied=true`}
                          >
                            <Briefcase className="mr-2 h-4 w-4" />
                            View Jobs
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => editCompany(company.id)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Company
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDeleteCompany(company)}
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
