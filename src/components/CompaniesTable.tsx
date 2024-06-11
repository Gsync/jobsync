"use client";
import { Button } from "./ui/button";
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { File, ListFilter, MoreHorizontal, PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Dialog, DialogContent } from "./ui/dialog";
import { Company } from "@/models/job.model";
import { useState } from "react";

function CompaniesTable({ companies }: { companies: Company[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const addCompanyForm = () => {
    // reset();
    // resetEditJob();
    setDialogOpen(true);
  };
  return (
    <div className="col-span-3">
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Companies</CardTitle>
          <div className="flex items-center">
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" className="h-8 gap-1" onClick={addCompanyForm}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Company
                </span>
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="lg:max-w-screen-lg lg:max-h-screen overflow-y-scroll"></DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Company Logo</span>
                </TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Value</TableHead>
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
                        src="/icons/amazon-logo.svg"
                        width="32"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.label}
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.value}
                    </TableCell>
                    <TableCell className="font-medium">
                      {company._count?.jobsApplied}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-10</strong> of <strong>32</strong> products
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default CompaniesTable;
