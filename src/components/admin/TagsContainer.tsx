"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { Tag } from "@/models/job.model";
import { getTagList } from "@/actions/tag.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Button } from "../ui/button";
import { RecordsCount } from "../RecordsCount";
import TagsTable from "./TagsTable";
import AddTag from "./AddTag";

function TagsContainer() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [totalTags, setTotalTags] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const loadTags = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const { data, total } = await getTagList(page, APP_CONSTANTS.RECORDS_PER_PAGE);
        if (data) {
          setTags((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalTags(total);
          setPage(page);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reloadTags = useCallback(async () => {
    await loadTags(1);
  }, [loadTags]);

  useEffect(() => {
    (async () => await loadTags(1))();
  }, [loadTags]);

  return (
    <>
      <div className="col-span-3">
        <Card>
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Skills/Tags</CardTitle>
              {!loading && totalTags > 0 && (
                <RecordsCount count={tags.length} total={totalTags} label="skills" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <AddTag reloadTags={reloadTags} />
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {loading && <Loading />}
            {tags.length > 0 && (
              <>
                <TagsTable tags={tags} reloadTags={reloadTags} />
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
