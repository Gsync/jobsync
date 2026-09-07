"use client";
import { useCallback, useState } from "react";
import { Loader } from "lucide-react";
import AddCompany from "./AddCompany";
import BoardsTable from "./BoardsTable";
import CompaniesTable from "./CompaniesTable";
import { WatchMergeDialog, type PendingMerge } from "./WatchMergeDialog";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import Loading from "../Loading";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";
import { JobBoardUrlAdd } from "../JobBoardUrlAdd";
import { getCompanyById, watchBoardCompany } from "@/actions/company.actions";
import { toastError, toastSuccess } from "@/lib/toast";
import { PROVIDER_META } from "@/components/automations/ats-search-step/types";
import { CompaniesScopeSelect } from "./companies-container/CompaniesScopeSelect";
import { useBoardsBrowse } from "./companies-container/useBoardsBrowse";
import { useCompaniesList } from "./companies-container/useCompaniesList";
import {
  boardProvider,
  useCompanyScope,
} from "./companies-container/useCompanyScope";
import type { LeverCompany } from "@/models/automation.model";

function CompaniesContainer() {
  const { scope, setScope } = useCompanyScope();
  const provider = boardProvider(scope);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(null);

  const listScope = scope === "watchlist" ? "watchlist" : "mine";
  const list = useCompaniesList(listScope, searchTerm, !provider);
  const browse = useBoardsBrowse(provider, searchTerm);

  const onEditCompany = async (companyId: string) => {
    const company = await getCompanyById(companyId);
    setEditCompany(company);
    setDialogOpen(true);
  };

  const onUrlResolved = useCallback(
    async (company: LeverCompany) => {
      if (!provider) return;
      const res = await watchBoardCompany(provider, company);
      if (res.success) {
        browse.markWatched(company.token, res.data.companyId);
        toastSuccess(`${company.name} added to your watchlist`);
      } else if ("needsConfirm" in res) {
        setPendingMerge({ provider, board: company, existing: res.existing });
      } else {
        toastError(res.message);
      }
    },
    [browse, provider],
  );

  const confirmMerge = async () => {
    if (!pendingMerge) return;
    const { provider: p, board } = pendingMerge;
    const res = await watchBoardCompany(p, board, { confirmMerge: true });
    setPendingMerge(null);
    if (res.success) {
      browse.markWatched(board.token, res.data.companyId);
      toastSuccess(`${board.name} linked and added to your watchlist`);
    } else if (!("needsConfirm" in res)) {
      toastError(res.message);
    }
  };

  const loading = provider ? browse.initialLoading : list.initialLoading;
  const loadingMore = provider ? browse.loadingMore : list.loadingMore;
  const hasMore = provider ? browse.hasMore : list.hasMore;
  const sentinelRef = provider ? browse.sentinelRef : list.sentinelRef;
  const shownCount = provider ? browse.rows.length : list.companies.length;
  const shownTotal = provider ? browse.total : list.total;

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Companies</CardTitle>
              {!loading && shownCount > 0 && (
                <RecordsCount
                  count={shownCount}
                  total={shownTotal}
                  label="companies"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
              <CompaniesScopeSelect scope={scope} onScopeChange={setScope} />
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search companies..."
              />
              <AddCompany
                editCompany={editCompany}
                reloadCompanies={list.reload}
                resetEditCompany={() => setEditCompany(null)}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
              />
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {provider && (
              <div className="mb-4">
                <JobBoardUrlAdd
                  provider={provider}
                  placeholder={PROVIDER_META[provider].urlHint}
                  disabled={false}
                  onResolved={onUrlResolved}
                />
              </div>
            )}
            {loading && <Loading />}
            {provider
              ? browse.rows.length > 0 && (
                  <BoardsTable
                    provider={provider}
                    rows={browse.rows}
                    watchedMap={browse.watchedMap}
                    onWatched={browse.markWatched}
                    onUnwatched={browse.unmarkWatched}
                    onNeedsMerge={setPendingMerge}
                  />
                )
              : list.companies.length > 0 && (
                  <CompaniesTable
                    companies={list.companies}
                    reloadCompanies={list.reload}
                    editCompany={onEditCompany}
                    scope={listScope}
                  />
                )}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center p-4">
                {loadingMore && (
                  <Loader className="h-5 w-5 animate-spin text-blue-500" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <WatchMergeDialog
        pending={pendingMerge}
        onConfirm={confirmMerge}
        onCancel={() => setPendingMerge(null)}
      />
    </>
  );
}

export default CompaniesContainer;
