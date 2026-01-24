"use client";
import { useCallback, useEffect, useState } from "react";
import AddCompany from "./AddCompany";
import CompaniesTable from "./CompaniesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Company } from "@/models/job.model";
import { getCompanyById, getCompanyList } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";

function CompaniesContainer() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCompanies, setTotalCompanies] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );

  const loadCompanies = useCallback(
    async (page: number) => {
      setLoading(true);
      const { data, total } = await getCompanyList(
        page,
        recordsPerPage,
        "applied"
      );
      if (data) {
        setCompanies((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalCompanies(total);
        setPage(page);
        setLoading(false);
      }
    },
    [recordsPerPage]
  );

  const reloadCompanies = useCallback(async () => {
    await loadCompanies(1);
  }, [loadCompanies]);

  const resetEditCompany = () => {
    setEditCompany(null);
  };

  useEffect(() => {
    (async () => await loadCompanies(1))();
  }, [loadCompanies, recordsPerPage]);

  const onEditCompany = async (companyId: string) => {
    const company = await getCompanyById(companyId);
    setEditCompany(company);
    setDialogOpen(true);
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
            {loading && <Loading />}
            {companies.length > 0 && (
              <>
                <CompaniesTable
                  companies={companies}
                  reloadCompanies={reloadCompanies}
                  editCompany={onEditCompany}
                />
                <div className="flex items-center justify-between mt-4">
                  <RecordsCount
                    count={companies.length}
                    total={totalCompanies}
                    label="companies"
                  />
                  {totalCompanies > APP_CONSTANTS.RECORDS_PER_PAGE && (
                    <RecordsPerPageSelector
                      value={recordsPerPage}
                      onChange={setRecordsPerPage}
                    />
                  )}
                </div>
              </>
            )}
            {companies.length < totalCompanies && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadCompanies(page + 1)}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default CompaniesContainer;
