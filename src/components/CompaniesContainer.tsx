"use client";
import { useCallback, useEffect, useState } from "react";
import AddCompany from "./AddCompany";
import CompaniesTable from "./CompaniesTable";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Company } from "@/models/job.model";
import { getCompanyById, getCompanyList } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "./Loading";

function CompaniesContainer() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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

  const reloadCompanies = () => {
    loadCompanies(1);
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
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!loading ? (
              <CompaniesTable
                companies={companies}
                currentPage={currentPage}
                totalPages={totalPages}
                recordsPerPage={recordsPerPage}
                totalCompanies={totalCompanies}
                onPageChange={setCurrentPage}
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
