"use client";
import { Button, buttonVariants } from "../ui/button";
import Image from "next/image";
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
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { TablePagination } from "../TablePagination";
import { useState } from "react";
import { AlertDialog } from "../ui/alert-dialog";
import { deleteCompanyById } from "@/actions/company.actions";
import { toast } from "../ui/use-toast";
import { redirect } from "next/navigation";
import { DeleteAlertDialog } from "../DeleteAlertDialog";

type CompaniesTableProps = {
  companies: Company[];
  reloadCompanies: (p: number) => void;
  currentPage: number;
  totalPages: number;
  totalCompanies: number;
  recordsPerPage: number;
  onPageChange: (n: number) => void;
  editCompany: (id: string) => void;
};

type AlertDialog = {
  openState: boolean;
  title?: string;
  description?: string;
  deleteAction: boolean;
  itemId?: string;
};

function CompaniesTable({
  companies,
  reloadCompanies,
  currentPage,
  totalPages,
  totalCompanies,
  recordsPerPage,
  onPageChange,
  editCompany,
}: CompaniesTableProps) {
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });
  const startPostIndex = (currentPage - 1) * recordsPerPage + 1;
  const endPostIndex = Math.min(currentPage * recordsPerPage, totalCompanies);

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
        title: "Are you sure you want to delete this job?",
        description:
          "This action cannot be undone. This will permanently delete and remove data from server.",
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
        reloadCompanies(currentPage);
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
                  <Image
                    alt="Company logo"
                    className="aspect-square rounded-md object-cover"
                    height="32"
                    src={company.logoUrl || "/images/jobsync-logo.svg"}
                    width="32"
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
      <div className="text-xs text-muted-foreground">
        Showing{" "}
        <strong>
          {startPostIndex} to {endPostIndex}
        </strong>{" "}
        of
        <strong> {totalCompanies}</strong> companies
      </div>
      {totalCompanies > recordsPerPage && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
      <DeleteAlertDialog
        pageTitle="company"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteCompany(alert.itemId)}
      />
    </>
  );
}

export default CompaniesTable;
