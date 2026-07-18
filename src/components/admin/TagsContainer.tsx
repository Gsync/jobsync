"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardTitle } from "../ui/card";
import { ResponsiveCardHeader } from "../ResponsiveCardHeader";
import { Tag } from "@/models/job.model";
import { getTagList } from "@/actions/tag.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { Loader } from "lucide-react";
import { RecordsCount } from "../RecordsCount";
import TagsTable from "./TagsTable";
import AddTag from "./AddTag";
import { SearchInput } from "../SearchInput";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

function TagsContainer() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [totalTags, setTotalTags] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);
  const requestIdRef = useRef(0);
  const loadTags = useCallback(
    async (page: number, search?: string) => {
      const requestId = ++requestIdRef.current;
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      try {
        const { data, total } = await getTagList(
          page,
          APP_CONSTANTS.RECORDS_PER_PAGE,
          search,
        );
        if (requestId !== requestIdRef.current) return;
        if (data) {
          setTags((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalTags(total);
          setPage(page);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setInitialLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const reloadTags = useCallback(async () => {
    await loadTags(1, searchTerm || undefined);
  }, [loadTags, searchTerm]);

  useEffect(() => {
    (async () => await loadTags(1))();
  }, [loadTags]);

  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadTags(1, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const hasMoreTags = tags.length < totalTags;
  const sentinelRef = useInfiniteScroll(
    hasMoreTags,
    initialLoading || loadingMore,
    useCallback(
      () => loadTags(page + 1, searchTerm || undefined),
      [loadTags, page, searchTerm],
    ),
  );

  return (
    <>
      <div className="col-span-3">
        <Card>
          <ResponsiveCardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Skills/Tags</CardTitle>
              {!initialLoading && totalTags > 0 && (
                <RecordsCount count={tags.length} total={totalTags} label="skills" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search skills..."
              />
              <AddTag reloadTags={reloadTags} />
            </div>
          </ResponsiveCardHeader>
          <CardContent>
            {initialLoading && <Loading />}
            {tags.length > 0 && (
              <>
                <TagsTable tags={tags} reloadTags={reloadTags} />
              </>
            )}
            {hasMoreTags && (
              <div ref={sentinelRef} className="flex justify-center p-4">
                {loadingMore && (
                  <Loader className="h-5 w-5 animate-spin text-blue-500" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default TagsContainer;
