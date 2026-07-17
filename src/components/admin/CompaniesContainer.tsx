"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import AddCompany from "./AddCompany";
import CompaniesTable from "./CompaniesTable";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { Company } from "@/models/job.model";
import { getCompanyById, getCompanyList } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";

function CompaniesContainer() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCompanies, setTotalCompanies] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);
  const loadCompanies = useCallback(
    async (page: number, search?: string) => {
      setLoading(true);
      const { data, total } = await getCompanyList(
        page,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        "applied",
        search
      );
      if (data) {
        setCompanies((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalCompanies(total);
        setPage(page);
        setLoading(false);
      }
    },
    []
  );

  const reloadCompanies = useCallback(async () => {
    await loadCompanies(1, searchTerm || undefined);
  }, [loadCompanies, searchTerm]);

  const resetEditCompany = () => {
    setEditCompany(null);
  };

  useEffect(() => {
    (async () => await loadCompanies(1))();
  }, [loadCompanies]);

  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadCompanies(1, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const onEditCompany = async (companyId: string) => {
    const company = await getCompanyById(companyId);
    setEditCompany(company);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Companies</CardTitle>
              {!loading && totalCompanies > 0 && (
                <RecordsCount count={companies.length} total={totalCompanies} label="companies" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search companies..."
              />
              <AddCompany
                editCompany={editCompany}
                reloadCompanies={reloadCompanies}
                resetEditCompany={resetEditCompany}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
              />
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {loading && <Loading />}
            {companies.length > 0 && (
              <>
                <CompaniesTable
                  companies={companies}
                  reloadCompanies={reloadCompanies}
                  editCompany={onEditCompany}
                />
              </>
            )}
            {companies.length < totalCompanies && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadCompanies(page + 1, searchTerm || undefined)}
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
