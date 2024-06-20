"use client";
import { Button } from "./ui/button";
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Company } from "@/models/job.model";
import { MoreHorizontal, Pencil } from "lucide-react";
import { TablePagination } from "./TablePagination";

type CompaniesTableProps = {
  companies: Company[];
  currentPage: number;
  totalPages: number;
  totalCompanies: number;
  recordsPerPage: number;
  onPageChange: (n: number) => void;
  editCompany: (id: string) => void;
};

function CompaniesTable({
  companies,
  currentPage,
  totalPages,
  totalCompanies,
  recordsPerPage,
  onPageChange,
  editCompany,
}: CompaniesTableProps) {
  const startPostIndex = (currentPage - 1) * recordsPerPage + 1;
  const endPostIndex = Math.min(currentPage * recordsPerPage, totalCompanies);

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
                      <DropdownMenuItem>Delete</DropdownMenuItem>
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
      {totalCompanies > recordsPerPage ? (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}

export default CompaniesTable;
