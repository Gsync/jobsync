"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { getActivityTypeList } from "@/actions/activity.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsCount } from "../RecordsCount";
import ActivityTypesTable from "./ActivityTypesTable";
import AddActivityType from "./AddActivityType";

function ActivityTypesContainer() {
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [totalActivityTypes, setTotalActivityTypes] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const loadActivityTypes = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const { data, total } = await getActivityTypeList(page, APP_CONSTANTS.RECORDS_PER_PAGE);
        if (data) {
          setActivityTypes((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalActivityTypes(total);
          setPage(page);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reloadActivityTypes = useCallback(async () => {
    await loadActivityTypes(1);
  }, [loadActivityTypes]);

  useEffect(() => {
    (async () => await loadActivityTypes(1))();
  }, [loadActivityTypes]);

  return (
    <>
      <div className="col-span-3">
        <Card>
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Activity Types / Projects</CardTitle>
              {!loading && totalActivityTypes > 0 && (
                <RecordsCount count={activityTypes.length} total={totalActivityTypes} label="activity types" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <AddActivityType reloadActivityTypes={reloadActivityTypes} />
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {loading && <Loading />}
            {activityTypes.length > 0 && (
              <>
                <ActivityTypesTable
                  activityTypes={activityTypes}
                  reloadActivityTypes={reloadActivityTypes}
                />
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
