"use client";

import { useState, useTransition } from "react";
import {
  X,
  Loader2,
  Plus,
  ChevronsUpDown,
  CirclePlus,
  TriangleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  searchGreenhouseCompanies,
  resolveGreenhouseBoard,
} from "@/actions/greenhouseCompany.actions";
import { getAllJobTitles, createJobTitle } from "@/actions/jobtitle.actions";
import { getAllTags, createTag } from "@/actions/tag.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { createLocation } from "@/actions/job.actions";
import { toast } from "@/components/ui/use-toast";
import { APP_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  GreenhouseCompany,
  GreenhouseSourceConfig,
} from "@/models/automation.model";

interface GreenhouseSearchStepProps {
  value: GreenhouseSourceConfig;
  onChange: (next: GreenhouseSourceConfig) => void;
}

type EntityOption = { id: string; label: string; value: string };

// Generic chip input that searches existing DB entities and can create new ones.
// `values` is a string[] of labels (not IDs) stored in GreenhouseSourceConfig.
function EntityStringChipInput({
  label,
  description,
  placeholder,
  noun,
  values,
  onChange,
  loadOptions,
  createOption,
}: {
  label: string;
  description: string;
  placeholder: string;
  noun: string;
  values: string[];
  onChange: (next: string[]) => void;
  loadOptions: () => Promise<EntityOption[]>;
  createOption: (label: string) => Promise<EntityOption | null>;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, startCreate] = useTransition();

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && !loaded) {
      setIsLoading(true);
      loadOptions()
        .then((opts) => {
          setOptions(Array.isArray(opts) ? opts : []);
          setLoaded(true);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  };

  const inputLower = input.trim().toLowerCase();

  const filtered = options.filter(
    (o) =>
      !values.includes(o.label) &&
      o.label.toLowerCase().includes(inputLower),
  );

  const exactMatch = options.some((o) => o.value === inputLower);
  const alreadyAdded = values.some((v) => v.toLowerCase() === inputLower);

  const addLabel = (lbl: string) => {
    const trimmed = lbl.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput("");
    setOpen(false);
  };

  const handleCreate = () => {
    const lbl = input.trim();
    if (!lbl || alreadyAdded || isCreating) return;
    startCreate(async () => {
      const created = await createOption(lbl);
      if (!created) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to create ${noun}.`,
        });
        return;
      }
      setOptions((prev) =>
        prev.some((o) => o.id === created.id) ? prev : [...prev, created],
      );
      addLabel(created.label);
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal text-muted-foreground"
          >
            {placeholder}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search or create ${noun}...`}
              value={input}
              onValueChange={setInput}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
              {!isLoading && !input.trim() && filtered.length === 0 && (
                <CommandEmpty>No {noun}s found. Type to create one.</CommandEmpty>
              )}
              {input.trim() && alreadyAdded && (
                <CommandEmpty>Already added.</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((o) => (
                    <CommandItem
                      key={o.id}
                      value={o.value}
                      onSelect={() => addLabel(o.label)}
                    >
                      {o.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {input.trim() && !exactMatch && !alreadyAdded && (
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreate}
                    disabled={isCreating}
                    className="text-primary"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CirclePlus className="h-4 w-4 mr-2" />
                    )}
                    Create &quot;{input.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function GreenhouseSearchStep({
  value,
  onChange,
}: GreenhouseSearchStepProps) {
  const companies = value.companies ?? [];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GreenhouseCompany[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, startSearch] = useTransition();

  const [urlInput, setUrlInput] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim().length < 1) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const found = await searchGreenhouseCompanies(val);
      setResults(found);
    });
  };

  const addCompany = (company: GreenhouseCompany) => {
    if (companies.some((c) => c.token === company.token)) return;
    if (companies.length >= APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES) return;
    onChange({ ...value, companies: [...companies, company] });
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const removeCompany = (token: string) => {
    onChange({
      ...value,
      companies: companies.filter((c) => c.token !== token),
    });
  };

  const resolveUrl = async () => {
    setUrlError(null);
    setIsResolving(true);
    try {
      const result = await resolveGreenhouseBoard(urlInput);
      if (result.success) {
        addCompany({ name: result.name, token: result.token });
        setUrlInput("");
      } else {
        setUrlError(result.message);
      }
    } finally {
      setIsResolving(false);
    }
  };

  const atLimit = companies.length >= APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES;

  // Without target titles or keywords there is no signal to rank jobs against,
  // so the relevance floor drops everything and nothing is saved.
  const noSignal =
    (value.targetTitles?.length ?? 0) === 0 &&
    (value.keywords?.length ?? 0) === 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Greenhouse Companies{" "}
          <span className="text-muted-foreground">
            ({companies.length}/{APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES})
          </span>
        </Label>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-between font-normal text-muted-foreground",
                atLimit && "opacity-50 cursor-not-allowed",
              )}
              disabled={atLimit}
            >
              {atLimit
                ? `Max ${APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES} companies reached`
                : "Search companies (e.g., Anthropic)"}
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Type to search..."
                value={query}
                onValueChange={handleQueryChange}
              />
              <CommandList>
                {isSearching && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                )}
                {!isSearching && !query.trim() && (
                  <CommandEmpty>Type a company name to search.</CommandEmpty>
                )}
                {!isSearching && query.trim() && results.length === 0 && (
                  <CommandEmpty>
                    No matches. Try &quot;Add by URL&quot; below.
                  </CommandEmpty>
                )}
                <CommandGroup>
                  {results.map((c) => (
                    <CommandItem
                      key={c.token}
                      value={c.token}
                      onSelect={() => addCompany(c)}
                    >
                      <span>{c.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.token}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {companies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {companies.map((c) => (
              <Badge key={c.token} variant="secondary" className="gap-1">
                {c.name}
                <button type="button" onClick={() => removeCompany(c.token)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Or paste a boards.greenhouse.io link"
            value={urlInput}
            disabled={atLimit}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                resolveUrl();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={resolveUrl}
            disabled={isResolving || atLimit || urlInput.trim().length === 0}
          >
            {isResolving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        {urlError && <p className="text-sm text-destructive">{urlError}</p>}
        <p className="text-sm text-muted-foreground">
          Select Greenhouse companies to monitor their job boards for new openings.
        </p>
      </div>

      <EntityStringChipInput
        label="Target job titles"
        placeholder="e.g., Frontend Engineer"
        noun="job title"
        description="Optional. Listings whose title matches rank higher."
        values={value.targetTitles ?? []}
        onChange={(next) => onChange({ ...value, targetTitles: next })}
        loadOptions={async () => {
          const res = await getAllJobTitles();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createJobTitle(lbl);
          return res?.id ? res : null;
        }}
      />

      <EntityStringChipInput
        label="Keywords / skills"
        placeholder="e.g., React"
        noun="keyword"
        description="Optional. Matched against title and description."
        values={value.keywords ?? []}
        onChange={(next) => onChange({ ...value, keywords: next })}
        loadOptions={async () => {
          const res = await getAllTags();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createTag(lbl);
          return res?.success ? res.data : null;
        }}
      />

      {noSignal && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Add at least one target title or keyword. Without them there is
            nothing to rank jobs against, so this automation will save no
            listings.
          </span>
        </div>
      )}

      <EntityStringChipInput
        label="Locations"
        placeholder="e.g., Canada, Remote"
        noun="location"
        description="Optional. Used only to filter results when the toggle below is on (not part of ranking)."
        values={value.locations ?? []}
        onChange={(next) => onChange({ ...value, locations: next })}
        loadOptions={async () => {
          const res = await getAllJobLocations();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createLocation(lbl);
          return res?.success ? res.data : null;
        }}
      />

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-1">
          <Label>Only show jobs in these locations</Label>
          <p className="text-sm text-muted-foreground">
            When on, jobs matching none of your locations are dropped before
            ranking. Remote roles always pass.
          </p>
        </div>
        <Switch
          checked={!!value.strictLocation}
          disabled={(value.locations ?? []).length === 0}
          onCheckedChange={(checked) =>
            onChange({ ...value, strictLocation: checked })
          }
        />
      </div>
    </div>
  );
}
