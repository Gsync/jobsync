"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { APP_CONSTANTS } from "@/lib/constants";
import { JobTitle } from "@prisma/client";
import JobLocationsTable from "./JobLocationsTable";
import { getJobLocationsList } from "@/actions/jobLocation.actions";
import { getMockList } from "@/lib/mock.utils";

function JobLocationsContainer() {
  const [Locations, setLocations] = useState<JobTitle[]>([]);
  const [totalJobLocations, setTotalJobLocations] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [editJobLocation, setEditJobLocation] = useState(null);

  const recordsPerPage = APP_CONSTANTS.RECORDS_PER_PAGE;

  const totalPages = Math.ceil(totalJobLocations / recordsPerPage);

  const loadJobLocations = useCallback(
    async (page: number) => {
      // const { data, total } = await getJobLocationsList(
      //   page,
      //   recordsPerPage,
      //   "applied"
      // );
      const { data, total } = await getMockList(
        page,
        recordsPerPage,
        "locations"
      );
      setLocations(data);
      setTotalJobLocations(total);
    },
    [recordsPerPage]
  );

  const reloadJobLocations = () => {
    loadJobLocations(1);
  };

  const resetEditJobLocation = () => {
    setEditJobLocation(null);
  };

  useEffect(() => {
    loadJobLocations(currentPage);
  }, [currentPage, loadJobLocations]);

  return (
    <>
      <div className="col-span-3">
        <Card x-chunk="dashboard-06-chunk-0">
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Job Locations</CardTitle>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
                {/* <AddCompany reloadCompanies={reloadJobLocations} /> */}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <JobLocationsTable
              jobLocations={Locations}
              currentPage={currentPage}
              totalPages={totalPages}
              recordsPerPage={recordsPerPage}
              totalJobLocations={totalJobLocations}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default JobLocationsContainer;
