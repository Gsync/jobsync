"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  createLinkedInSearch,
  deleteLinkedInSearch,
  getLinkedInSearchResults,
  importLinkedInJob,
} from "@/actions/linkedin.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/Loading";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import type {
  LinkedInSearch,
  LinkedInSearchPage,
  LinkedInSearchResult,
} from "@/models/linkedin.model";

interface LinkedInSearchesContainerProps {
  initialSearches: LinkedInSearch[];
}

export function LinkedInSearchesContainer({
  initialSearches,
}: LinkedInSearchesContainerProps) {
  const [searches, setSearches] = useState(initialSearches);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSearches[0]?.id ?? null,
  );
  const [results, setResults] = useState<LinkedInSearchResult[]>([]);
  const [nextStart, setNextStart] = useState<number | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const selectedSearch = searches.find((search) => search.id === selectedId);

  useEffect(() => {
    if (!selectedId) {
      setResults([]);
      setNextStart(null);
      return;
    }

    let cancelled = false;
    setLoadingResults(true);
    setError(null);

    getLinkedInSearchResults(selectedId, 0)
      .then((result) => {
        if (cancelled) return;
        if (result?.success && result.data) {
          const page = result.data as LinkedInSearchPage;
          setResults(page.results ?? []);
          setNextStart(page.nextStart ?? null);
        } else {
          setResults([]);
          setNextStart(null);
          setError(result?.message ?? "Could not load LinkedIn results.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load LinkedIn results.");
      })
      .finally(() => {
        if (!cancelled) setLoadingResults(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshToken]);

  const handleLoadMore = async () => {
    if (!selectedId || nextStart === null) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await getLinkedInSearchResults(selectedId, nextStart);
      if (result?.success && result.data) {
        const page = result.data as LinkedInSearchPage;
        setResults((previous) => {
          const seen = new Set(previous.map((item) => item.id));
          return [
            ...previous,
            ...(page.results ?? []).filter((item) => !seen.has(item.id)),
          ];
        });
        setNextStart(page.nextStart ?? null);
      } else {
        setError(result?.message ?? "Could not load more results.");
      }
    } catch {
      setError("Could not load more results.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await createLinkedInSearch({
        name: name.trim() || undefined,
        url,
      });
      if (result?.success && result.data) {
        const saved = result.data as LinkedInSearch;
        setSearches((previous) => [
          saved,
          ...previous.filter((search) => search.id !== saved.id),
        ]);
        setSelectedId(saved.id);
        setDialogOpen(false);
        setName("");
        setUrl("");
        toastSuccess("LinkedIn search saved.");
      } else {
        toastError(result?.message ?? "Could not save this search.");
      }
    } catch {
      toastError("Could not save this search.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (search: LinkedInSearch) => {
    if (
      !window.confirm(
        "Remove this saved search? Jobs already added to JobSync stay put.",
      )
    ) {
      return;
    }

    const result = await deleteLinkedInSearch(search.id);
    if (!result?.success) {
      toastError(result?.message ?? "Could not remove this search.");
      return;
    }

    const remaining = searches.filter((item) => item.id !== search.id);
    setSearches(remaining);
    if (selectedId === search.id) {
      setSelectedId(remaining[0]?.id ?? null);
    }
    toastSuccess("Search removed.");
  };

  const handleAdd = async (result: LinkedInSearchResult) => {
    setAddingId(result.id);
    try {
      const imported = await importLinkedInJob(result.url);
      if (!imported?.success) {
        toastError(imported?.message ?? "Could not add this job.");
        return;
      }

      const data = imported.data as {
        created?: boolean;
        message?: string;
      };
      if (data?.created === false) {
        toastInfo(data.message ?? "This job is already saved.");
      } else {
        toastSuccess(`Added "${result.title}" to your jobs.`);
      }
    } catch {
      toastError("Could not add this job.");
    } finally {
      setAddingId(null);
    }
  };

  const refresh = () => setRefreshToken((token) => token + 1);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>LinkedIn searches</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">
              LinkedIn doesn&apos;t share your account&apos;s saved searches
              with apps. Paste a search or saved-search URL from LinkedIn and
              JobSync will re-run it against the public listings, so you can add
              postings without leaving JobSync.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              aria-label="Refresh results"
              disabled={!selectedId || loadingResults}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-2">
              {searches.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No searches yet. Add one to start browsing LinkedIn results.
                </div>
              ) : (
                searches.map((search) => (
                  <div
                    key={search.id}
                    className={`flex items-start gap-1 rounded-md border p-2 ${
                      search.id === selectedId ? "bg-muted" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(search.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium">
                        {search.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[search.keywords, search.location]
                          .filter(Boolean)
                          .join(" · ") || "LinkedIn search"}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleDelete(search)}
                      aria-label={`Remove ${search.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="min-w-0 space-y-3">
              {!selectedSearch ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  <Search className="h-6 w-6" />
                  <p>Select a search, or add a LinkedIn search URL to begin.</p>
                </div>
              ) : loadingResults ? (
                <Loading />
              ) : error ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p>{error}</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  <Search className="h-6 w-6" />
                  <p>No public results for this search right now.</p>
                  <a
                    href={selectedSearch.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    Open it on LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {results.length} result{results.length === 1 ? "" : "s"}
                      {nextStart !== null ? " so far" : ""}
                    </p>
                    <a
                      href={selectedSearch.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Open on LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="space-y-2">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium">
                            {result.title}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {[result.company, result.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {result.postedDate && (
                            <p className="text-xs text-muted-foreground">
                              {result.postedDate}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAdd(result)}
                            disabled={addingId === result.id}
                          >
                            {addingId === result.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {nextStart !== null && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a LinkedIn search</DialogTitle>
            <DialogDescription>
              In LinkedIn, run or open a saved search and copy the URL from your
              browser. JobSync stores the search filters, not your LinkedIn
              account or credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-search-url">LinkedIn search URL</Label>
              <Input
                id="linkedin-search-url"
                placeholder="https://www.linkedin.com/jobs/search/?keywords=designer&location=Toronto"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin-search-name">
                Name{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  optional
                </span>
              </Label>
              <Input
                id="linkedin-search-name"
                placeholder="e.g. Remote product design"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !url.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
