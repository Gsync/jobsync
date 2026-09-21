"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobStageTypeRef } from "@/models/jobStage.model";
import { JobStatus } from "@/models/job.model";
import JobStagesTable from "./JobStagesTable";
import AddJobStageType from "./AddJobStageType";
import { getJobStageTypeList } from "@/actions/jobStageType.actions";
import { getStatusList } from "@/actions/job.actions";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";

function JobStagesContainer() {
  const [types, setTypes] = useState<JobStageTypeRef[]>([]);
  const [totalTypes, setTotalTypes] = useState<number>(0);
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editType, setEditType] = useState<JobStageTypeRef | null>(null);

  const loadTypes = useCallback(async (page: number, search?: string) => {
    setLoading(true);
    const { data, total } = await getJobStageTypeList(
      page,
      APP_CONSTANTS.RECORDS_PER_PAGE,
      search,
    );
    if (data) {
      setTypes((prev) => (page === 1 ? data : [...prev, ...data]));
      setTotalTypes(total);
      setPage(page);
    }
    setLoading(false);
  }, []);

  const reloadTypes = useCallback(
    async () => loadTypes(1, searchTerm || undefined),
    [loadTypes, searchTerm],
  );

  // One effect for mount and debounced search: both reset to page 1 and
  // replace the list, so a separate mount effect would double-fetch.
  useEffect(() => {
    const timer = setTimeout(
      () => loadTypes(1, searchTerm || undefined),
      searchTerm ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [searchTerm, loadTypes]);

  useEffect(() => {
    getStatusList().then((list) => setStatuses(list ?? []));
  }, []);

  const openAdd = () => {
    setEditType(null);
    setDialogOpen(true);
  };

  const openEdit = (type: JobStageTypeRef) => {
    setEditType(type);
    setDialogOpen(true);
  };

  return (
    <div className="col-span-3">
      <Card x-chunk="dashboard-06-chunk-0">
        <ResponsiveCardHeader>
          <div className="flex items-baseline gap-2">
            <CardTitle>Job Stages</CardTitle>
            {!loading && totalTypes > 0 && (
              <RecordsCount
                count={types.length}
                total={totalTypes}
                label="stages"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search stages..."
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={openAdd}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                New Stage
              </span>
            </Button>
          </div>
        </ResponsiveCardHeader>
        <CardContent>
          {loading && <Loading />}
          {types.length > 0 && (
            <JobStagesTable
              types={types}
              reloadTypes={reloadTypes}
              onEdit={openEdit}
            />
          )}
          {types.length < totalTypes && (
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadTypes(page + 1, searchTerm || undefined)}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <AddJobStageType
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={editType}
        statuses={statuses}
        reloadTypes={reloadTypes}
      />
    </div>
  );
}

export default JobStagesContainer;
