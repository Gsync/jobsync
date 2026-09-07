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
import {
  Briefcase,
  ExternalLink,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Trash,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { deleteCompanyById, setCompanyWatched } from "@/actions/company.actions";
import { companyBoardUrl } from "@/lib/atsBoardUrl";
import { PROVIDER_META } from "@/components/automations/ats-search-step/types";
import { toastSuccess, toastError } from "@/lib/toast";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { AlertDialog } from "@/models/alertDialog.model";
import type { JobBoard, LeverHost } from "@/models/automation.model";

type CompaniesTableProps = {
  companies: Company[];
  reloadCompanies: () => void;
  editCompany: (id: string) => void;
  scope?: "mine" | "watchlist";
};

// A watched row may have no board (a company watched from the Library), so the
// cell degrades to an em dash rather than building a URL from a null token.
function BoardCell({ company }: { company: Company }) {
  if (!company.atsToken || !company.atsProvider) {
    return <span className="text-muted-foreground">—</span>;
  }
  const provider = company.atsProvider as JobBoard;
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">
        {PROVIDER_META[provider].label} {company.atsToken}
      </span>
      <a
        href={companyBoardUrl(provider, {
          token: company.atsToken,
          host: (company.atsHost as LeverHost) ?? undefined,
        })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${company.label} job board`}
        title="Open job board"
        className="text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}

function CompaniesTable({
  companies,
  reloadCompanies,
  editCompany,
  scope = "mine",
}: CompaniesTableProps) {
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteCompany = (company: Company) => {
    const totalJobs = company._count?.jobsTotal ?? 0;
    if (totalJobs > 0) {
      setAlert({
        openState: true,
        title: "Associated jobs exist!",
        description: `This company has ${totalJobs} associated job${
          totalJobs === 1 ? "" : "s"
        } (applied or not). Remove or reassign them before deleting this company.`,
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

  const toggleWatch = async (company: Company) => {
    const next = !company.watched;
    const res = await setCompanyWatched(company.id, next);
    if (res.success) {
      toastSuccess(
        next
          ? `${company.label} added to your watchlist`
          : `${company.label} removed from your watchlist. It stays in your Library.`,
      );
      reloadCompanies();
    } else {
      toastError(res.message);
    }
  };

  const deleteCompany = async (companyId: string | undefined) => {
    if (companyId) {
      const { res, success, message } = await deleteCompanyById(companyId);
      if (success) {
        toastSuccess(`Company has been deleted successfully`);
        reloadCompanies();
      } else {
        toastError(message);
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
            {scope === "watchlist" ? (
              <>
                <TableHead>Board</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Watched</TableHead>
              </>
            ) : (
              <>
                <TableHead className="hidden sm:table-cell">Value</TableHead>
                <TableHead>Total Jobs</TableHead>
                <TableHead>Jobs Applied</TableHead>
                <TableHead>Rejected</TableHead>
              </>
            )}
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
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/jobsync-logo.svg";
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-1.5">
                    {company.label}
                    {company.watched && (
                      <span
                        title="On your watchlist"
                        className="text-emerald-600 dark:text-emerald-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {scope !== "watchlist" && company.atsToken && (
                      <BoardCell company={company} />
                    )}
                  </span>
                </TableCell>
                {scope === "watchlist" ? (
                  <>
                    <TableCell>
                      <BoardCell company={company} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {company._count?.jobsTotal ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.watchedAt
                        ? formatDistanceToNow(new Date(company.watchedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium hidden sm:table-cell">
                      {company.value}
                    </TableCell>
                    <TableCell className="font-medium">
                      {company._count?.jobsTotal ? (
                        <Link
                          href={`/dashboard/myjobs?company=${encodeURIComponent(company.value)}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {company._count.jobsTotal}
                        </Link>
                      ) : (
                        (company._count?.jobsTotal ?? 0)
                      )}
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
                  </>
                )}
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
                        className="cursor-pointer"
                        onClick={() => toggleWatch(company)}
                      >
                        {company.watched ? (
                          <EyeOff className="mr-2 h-4 w-4" />
                        ) : (
                          <Eye className="mr-2 h-4 w-4" />
                        )}
                        {company.watched ? "Unwatch" : "Watch"}
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
