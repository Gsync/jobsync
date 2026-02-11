"use client";
import ActivitiesTable from "./ActivitiesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlusCircle, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ActivityForm } from "./ActivityForm";
import { getActivitiesList } from "@/actions/activity.actions";
import { Activity } from "@/models/activity.model";
import { toast } from "../ui/use-toast";
import Loading from "../Loading";
import { APP_CONSTANTS } from "@/lib/constants";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import { useActivity } from "@/context/ActivityContext";

function ActivitiesContainer() {
  const [activityFormOpen, setActivityFormOpen] = useState<boolean>(false);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE
  );
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);

  const { currentActivity, startActivity } = useActivity();
  const prevActivityRef = useRef<Activity | undefined>(undefined);

  const closeActivityForm = () => setActivityFormOpen(false);

  const loadActivities = useCallback(
    async (page: number, limit: number, search?: string) => {
      setLoading(true);
      try {
        const { data, success, message, total } = await getActivitiesList(
          page,
          limit,
          search
        );
        if (success) {
          setActivitiesList((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalActivities(total);
          setPage(page);
        } else {
          toast({
            variant: "destructive",
            title: "Error!",
            description: message,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: "Failed to load activities. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reloadActivities = useCallback(async () => {
    await loadActivities(1, recordsPerPage, searchTerm || undefined);
  }, [loadActivities, recordsPerPage, searchTerm]);

  const handleStartActivity = async (activityId: string) => {
    const success = await startActivity(activityId);
    if (success) {
      reloadActivities();
    }
  };

  useEffect(() => {
    loadActivities(1, recordsPerPage);
  }, [loadActivities, recordsPerPage]);

  // Reload activities when an activity is stopped (via global banner or otherwise)
  useEffect(() => {
    if (prevActivityRef.current && !currentActivity) {
      reloadActivities();
    }
    prevActivityRef.current = currentActivity;
  }, [currentActivity, reloadActivities]);

  // Debounced search effect
  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadActivities(1, recordsPerPage, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Activities</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search activities..."
              className="pl-8 h-8 w-[150px] lg:w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={activityFormOpen} onOpenChange={setActivityFormOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                data-testid="add-activity-btn"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Activity
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Activity</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <ActivityForm
                  onClose={closeActivityForm}
                  reloadActivities={reloadActivities}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <Loading />}
        {activitiesList.length > 0 && (
          <>
            <ActivitiesTable
              activities={activitiesList}
              reloadActivities={reloadActivities}
              onStartActivity={handleStartActivity}
              activityExist={Boolean(currentActivity)}
            />
            <div className="flex items-center justify-between mt-4">
              <RecordsCount
                count={activitiesList.length}
                total={totalActivities}
                label="activities"
              />
              {totalActivities > APP_CONSTANTS.RECORDS_PER_PAGE && (
                <RecordsPerPageSelector
                  value={recordsPerPage}
                  onChange={setRecordsPerPage}
                />
              )}
            </div>
          </>
        )}
        {activitiesList.length < totalActivities && (
          <div className="flex justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                loadActivities(page + 1, recordsPerPage, searchTerm || undefined)
              }
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
