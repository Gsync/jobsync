"use client";
import { useCallback, useEffect, useState } from "react";
import AddCompany from "./AddCompany";
import CompaniesTable from "./CompaniesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Company } from "@/models/job.model";
import { getCompanyById, getCompanyList } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function CompaniesContainer({
  createQueryString,
}: {
  createQueryString: (name: string, value: string) => void;
}) {
  const queryParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [currentPage, setCurrentPage] = useState(
    Number(queryParams.get("page")) || 1
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  const recordsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const totalPages = Math.ceil(totalCompanies / recordsPerPage);

  const loadCompanies = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total } = await getCompanyList(
        page,
        recordsPerPage,
        "applied"
      );
      setCompanies(data);
      setTotalCompanies(total);
      if (data) {
        setLoading(false);
      }
    },
    [recordsPerPage]
  );

  const reloadCompanies = (page = 1) => {
    loadCompanies(page);
  };

  const resetEditCompany = () => {
    setEditCompany(null);
  };

  useEffect(() => {
    loadCompanies(currentPage);
  }, [currentPage, loadCompanies]);

  const onEditCompany = async (companyId: string) => {
    const company = await getCompanyById(companyId);
    setEditCompany(company);
    setDialogOpen(true);
  };

  const onPageChange = (page: number) => {
    setCurrentPage(page);
    router.push(pathname + "?" + createQueryString("page", page.toString()));
  };

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Companies</CardTitle>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
                <AddCompany
                  editCompany={editCompany}
                  reloadCompanies={reloadCompanies}
                  resetEditCompany={resetEditCompany}
                  dialogOpen={dialogOpen}
                  setDialogOpen={setDialogOpen}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!loading ? (
              <CompaniesTable
                companies={companies}
                reloadCompanies={reloadCompanies}
                currentPage={currentPage}
                totalPages={totalPages}
                recordsPerPage={recordsPerPage}
                totalCompanies={totalCompanies}
                onPageChange={onPageChange}
                editCompany={onEditCompany}
              />
            ) : (
              <Loading />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default CompaniesContainer;
