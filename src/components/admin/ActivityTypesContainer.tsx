"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getActivityTypeList } from "@/actions/activity.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import ActivityTypesTable from "./ActivityTypesTable";
import AddActivityType from "./AddActivityType";

function ActivityTypesContainer() {
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [totalActivityTypes, setTotalActivityTypes] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );

  const loadActivityTypes = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const { data, total } = await getActivityTypeList(page, recordsPerPage);
        if (data) {
          setActivityTypes((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalActivityTypes(total);
          setPage(page);
        }
      } finally {
        setLoading(false);
      }
    },
    [recordsPerPage],
  );

  const reloadActivityTypes = useCallback(async () => {
    await loadActivityTypes(1);
  }, [loadActivityTypes]);

  useEffect(() => {
    (async () => await loadActivityTypes(1))();
  }, [loadActivityTypes, recordsPerPage]);

  return (
    <>
      <div className="col-span-3">
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Activity Types / Projects</CardTitle>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
                <AddActivityType reloadActivityTypes={reloadActivityTypes} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <Loading />}
            {activityTypes.length > 0 && (
              <>
                <ActivityTypesTable
                  activityTypes={activityTypes}
                  reloadActivityTypes={reloadActivityTypes}
                />
                <div className="flex items-center justify-between mt-4">
                  <RecordsCount
                    count={activityTypes.length}
                    total={totalActivityTypes}
                    label="activity types"
                  />
                  {totalActivityTypes > APP_CONSTANTS.RECORDS_PER_PAGE && (
                    <RecordsPerPageSelector
                      value={recordsPerPage}
                      onChange={setRecordsPerPage}
                    />
                  )}
                </div>
              </>
            )}
            {activityTypes.length < totalActivityTypes && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadActivityTypes(page + 1)}
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

export default ActivityTypesContainer;
