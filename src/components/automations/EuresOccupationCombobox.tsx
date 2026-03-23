"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import {
  ChevronsUpDown,
  Loader2,
  Eye,
  ExternalLink,
  Briefcase,
  Network,
} from "lucide-react";

import type { CreateAutomationInput } from "@/models/automation.schema";
import type { EscoSearchResult } from "@/app/api/esco/search/route";
import type { EscoOccupationDetails } from "@/app/api/esco/details/route";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChipList, type ChipItem } from "@/components/ui/chip-list";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { cn } from "@/lib/utils";

const MAX_KEYWORDS = 10;
const SEPARATOR = "||";

type EuresOccupationComboboxProps = {
  field: ControllerRenderProps<CreateAutomationInput, "keywords">;
  language?: string;
};

/** Detail popover for an ESCO occupation */
function OccupationDetailPopover({ uri }: { uri: string }) {
  const [details, setDetails] = useState<EscoOccupationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    setIsLoading(true);
    fetch(`/api/esco/details?uri=${encodeURIComponent(uri)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.title) setDetails(data);
      })
      .catch(() => {
        fetchedRef.current = false;
      })
      .finally(() => setIsLoading(false));
  }, [open, uri]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(320px,calc(100vw-2rem))] p-0"
        side="bottom"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {details && (
          <div className="p-3 space-y-3">
            <div>
              <h4 className="font-semibold text-sm">{details.title}</h4>
              {details.code && (
                <span className="text-xs text-muted-foreground">
                  ISCO {details.code}
                </span>
              )}
            </div>
            {details.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {details.description.length > 300
                  ? details.description.slice(0, 300) + "..."
                  : details.description}
              </p>
            )}
            {details.broaderIscoGroup && (
              <div className="flex items-center gap-1.5 text-xs">
                <Network className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">ISCO Group:</span>
                <a
                  href={`https://esco.ec.europa.eu/en/classification/occupation?uri=${encodeURIComponent(details.broaderIscoGroup.uri)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {details.broaderIscoGroup.code} — {details.broaderIscoGroup.title}
                </a>
              </div>
            )}
            <div className="flex gap-2 pt-1 border-t">
              <a
                href={details.escoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Briefcase className="h-3 w-3" />
                ESCO Portal
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a
                href={details.euresSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                EURES Jobs
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        )}
        {!isLoading && !details && (
          <p className="p-3 text-xs text-muted-foreground">
            Could not load occupation details.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function EuresOccupationCombobox({
  field,
  language = "en",
}: EuresOccupationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<EscoSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Store ESCO metadata for selected items (uri → EscoSearchResult)
  const [escoMeta, setEscoMeta] = useState<Map<string, EscoSearchResult>>(
    new Map(),
  );

  // Parse keywords from field value (separated by ||)
  const selectedKeywords = useMemo(() => {
    if (!field.value) return [];
    return field.value
      .split(SEPARATOR)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [field.value]);

  const isMaxReached = selectedKeywords.length >= MAX_KEYWORDS;

  const updateFieldValue = useCallback(
    (keywords: string[]) => {
      field.onChange(keywords.join(SEPARATOR));
    },
    [field],
  );

  const addKeyword = useCallback(
    (keyword: string, meta?: EscoSearchResult) => {
      if (isMaxReached) return;
      const trimmed = keyword.trim();
      if (!trimmed || selectedKeywords.includes(trimmed)) return;
      if (meta) {
        setEscoMeta((prev) => new Map(prev).set(trimmed, meta));
      }
      updateFieldValue([...selectedKeywords, trimmed]);
    },
    [selectedKeywords, isMaxReached, updateFieldValue],
  );

  const removeKeyword = useCallback(
    (keyword: string) => {
      updateFieldValue(selectedKeywords.filter((k) => k !== keyword));
      setEscoMeta((prev) => {
        const next = new Map(prev);
        next.delete(keyword);
        return next;
      });
    },
    [selectedKeywords, updateFieldValue],
  );

  const editKeyword = useCallback(
    (oldValue: string, newValue: string) => {
      const next = selectedKeywords.map((k) =>
        k === oldValue ? newValue : k,
      );
      updateFieldValue(next);
      // Transfer ESCO metadata to new value if it was an ESCO entry
      setEscoMeta((prev) => {
        const meta = prev.get(oldValue);
        if (!meta) return prev;
        const nextMeta = new Map(prev);
        nextMeta.delete(oldValue);
        nextMeta.set(newValue, meta);
        return nextMeta;
      });
    },
    [selectedKeywords, updateFieldValue],
  );

  // Debounced ESCO search
  const fetchResults = useCallback(
    (query: string) => {
      clearTimeout(debounceRef.current);
      if (query.length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/esco/search?text=${encodeURIComponent(query)}&language=${language}&limit=10`,
          );
          const data = await res.json();
          setResults(data.results ?? []);
        } catch {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [language],
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  // Build chip items with optional ESCO detail action
  const chipItems: ChipItem[] = selectedKeywords.map((keyword) => {
    const meta = escoMeta.get(keyword);
    return {
      value: keyword,
      label: keyword,
      action: meta ? <OccupationDetailPopover uri={meta.uri} /> : undefined,
    };
  });

  // Filter out already-selected results
  const filteredResults = results.filter(
    (r) => !selectedKeywords.includes(r.title),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between font-normal",
                isMaxReached && "opacity-50 cursor-not-allowed",
              )}
              disabled={isMaxReached}
              type="button"
            >
              {isMaxReached
                ? `Max ${MAX_KEYWORDS} keywords reached`
                : selectedKeywords.length > 0
                  ? `${selectedKeywords.length} keyword(s) selected`
                  : "Search ESCO occupations or type keywords..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search occupations or type custom keyword..."
                value={inputValue}
                onValueChange={(val) => {
                  setInputValue(val);
                  fetchResults(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    e.preventDefault();
                    addKeyword(inputValue.trim());
                    setInputValue("");
                    setResults([]);
                  }
                }}
              />
              <CommandList>
                {isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Custom keyword entry */}
                {!isLoading &&
                  inputValue.trim() &&
                  !selectedKeywords.includes(inputValue.trim()) && (
                    <CommandGroup heading="Custom keyword">
                      <CommandItem
                        onSelect={() => {
                          addKeyword(inputValue.trim());
                          setInputValue("");
                          setResults([]);
                        }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-sm">
                          Add &quot;{inputValue.trim()}&quot;
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          Enter ↵
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}

                {/* ESCO results */}
                {!isLoading && filteredResults.length > 0 && (
                  <CommandGroup heading="ESCO Occupations">
                    {filteredResults.map((result) => (
                      <CommandItem
                        key={result.uri}
                        onSelect={() => {
                          addKeyword(result.title, result);
                          setInputValue("");
                          setResults([]);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-sm">{result.title}</span>
                        {result.code && (
                          <span className="text-xs text-muted-foreground">
                            {result.code}
                          </span>
                        )}
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              `https://esco.ec.europa.eu/en/classification/occupation?uri=${encodeURIComponent(result.uri)}`,
                              "_blank",
                            );
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!isLoading &&
                  filteredResults.length === 0 &&
                  !inputValue.trim() && (
                    <CommandEmpty>
                      Type to search ESCO occupations...
                    </CommandEmpty>
                  )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <InfoTooltip>
          <p className="font-semibold mb-1">ESCO Occupations</p>
          <p className="text-xs mb-2">
            Search the European Skills, Competences, Qualifications and
            Occupations taxonomy. Selected occupations are matched against EURES
            job vacancies.
          </p>
          <p className="font-semibold mb-1">Custom Keywords</p>
          <p className="text-xs mb-2">
            Type any keyword and press Enter to add it as a free-text search
            term. Useful for non-standard job titles.
          </p>
          <p className="font-semibold mb-1">ISCO Groups</p>
          <p className="text-xs">
            Click the eye icon on a chip to see the ISCO classification group,
            which includes related occupations for broader searches.
          </p>
        </InfoTooltip>
      </div>

      {/* Selected keyword chips */}
      <ChipList
        items={chipItems}
        onRemove={removeKeyword}
        onEdit={editKeyword}
        editable
      />
    </div>
  );
}
