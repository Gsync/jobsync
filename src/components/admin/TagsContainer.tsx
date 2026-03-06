"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "@/models/job.model";
import { getTagList } from "@/actions/tag.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import TagsTable from "./TagsTable";
import AddTag from "./AddTag";

function TagsContainer() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [totalTags, setTotalTags] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );

  const loadTags = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const { data, total } = await getTagList(page, recordsPerPage);
        if (data) {
          setTags((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalTags(total);
          setPage(page);
        }
      } finally {
        setLoading(false);
      }
    },
    [recordsPerPage],
  );

  const reloadTags = useCallback(async () => {
    await loadTags(1);
  }, [loadTags]);

  useEffect(() => {
    (async () => await loadTags(1))();
  }, [loadTags, recordsPerPage]);

  return (
    <>
      <div className="col-span-3">
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Skills/Tags</CardTitle>
            <div className="flex items-center">
              <div className="ml-auto flex items-center gap-2">
                <AddTag reloadTags={reloadTags} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <Loading />}
            {tags.length > 0 && (
              <>
                <TagsTable tags={tags} reloadTags={reloadTags} />
                <div className="flex items-center justify-between mt-4">
                  <RecordsCount
                    count={tags.length}
                    total={totalTags}
                    label="skills"
                  />
                  {totalTags > APP_CONSTANTS.RECORDS_PER_PAGE && (
                    <RecordsPerPageSelector
                      value={recordsPerPage}
                      onChange={setRecordsPerPage}
                    />
                  )}
                </div>
              </>
            )}
            {tags.length < totalTags && (
              <div className="flex justify-center p-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTags(page + 1)}
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

export default TagsContainer;
