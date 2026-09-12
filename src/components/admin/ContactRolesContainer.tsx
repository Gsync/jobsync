"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { APP_CONSTANTS } from "@/lib/constants";
import { ContactRole } from "@/models/contact.model";
import ContactRolesTable from "./ContactRolesTable";
import AddContactRole from "./AddContactRole";
import { getContactRoleList } from "@/actions/contactRole.actions";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsCount } from "../RecordsCount";
import { SearchInput } from "../SearchInput";

function ContactRolesContainer() {
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [totalRoles, setTotalRoles] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const loadRoles = useCallback(async (page: number, search?: string) => {
    setLoading(true);
    const { data, total } = await getContactRoleList(
      page,
      APP_CONSTANTS.RECORDS_PER_PAGE,
      search,
    );
    if (data) {
      setRoles((prev) => (page === 1 ? data : [...prev, ...data]));
      setTotalRoles(total);
      setPage(page);
    }
    setLoading(false);
  }, []);

  const reloadRoles = useCallback(
    async () => loadRoles(1, searchTerm || undefined),
    [loadRoles, searchTerm],
  );

  // One effect for mount and debounced search: both reset to page 1 and
  // replace the list, so a separate mount effect would double-fetch.
  useEffect(() => {
    const timer = setTimeout(
      () => loadRoles(1, searchTerm || undefined),
      searchTerm ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [searchTerm, loadRoles]);

  return (
    <div className="col-span-3">
      <Card x-chunk="dashboard-06-chunk-0">
        <ResponsiveCardHeader>
          <div className="flex items-baseline gap-2">
            <CardTitle>Contact Roles</CardTitle>
            {!loading && totalRoles > 0 && (
              <RecordsCount
                count={roles.length}
                total={totalRoles}
                label="roles"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search roles..."
            />
            <AddContactRole reloadRoles={reloadRoles} />
          </div>
        </ResponsiveCardHeader>
        <CardContent>
          {loading && <Loading />}
          {roles.length > 0 && (
            <ContactRolesTable roles={roles} reloadRoles={reloadRoles} />
          )}
          {roles.length < totalRoles && (
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadRoles(page + 1, searchTerm || undefined)}
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
  );
}

export default ContactRolesContainer;
