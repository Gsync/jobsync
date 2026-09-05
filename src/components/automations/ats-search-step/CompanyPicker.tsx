"use client";

import { X, Loader2, ChevronsUpDown, ExternalLink, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { APP_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { JobBoard, LeverCompany } from "@/models/automation.model";
import { companyBoardUrl } from "@/lib/atsBoardUrl";
import { PROVIDER_META } from "./types";
import { useAtsCompanySearch } from "./useAtsCompanySearch";
import { CompanyUrlAdd } from "./CompanyUrlAdd";

interface CompanyPickerProps {
  provider: JobBoard;
  companies: LeverCompany[];
  onAdd: (company: LeverCompany) => void;
  onRemove: (token: string) => void;
}

export function CompanyPicker({
  provider,
  companies,
  onAdd,
  onRemove,
}: CompanyPickerProps) {
  const meta = PROVIDER_META[provider] ?? PROVIDER_META.greenhouse;
  const {
    query,
    results,
    totalCount,
    open,
    isSearching,
    handleQueryChange,
    handleOpen,
    handleListScroll,
  } = useAtsCompanySearch(provider);

  const atLimit = companies.length >= APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES;

  const toggleCompany = (company: LeverCompany) => {
    if (companies.some((c) => c.token === company.token)) {
      onRemove(company.token);
    } else {
      onAdd(company);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span>
          {meta.label} Companies{" "}
          <span className="font-normal text-muted-foreground">
            ({companies.length}/{APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES})
          </span>
        </span>
        {totalCount !== null && totalCount > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {totalCount} available
          </span>
        )}
      </Label>

      <Popover open={open} onOpenChange={handleOpen} modal>
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
              : `Search companies (e.g., ${meta.searchExample})`}
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width)"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or browse companies..."
              value={query}
              onValueChange={handleQueryChange}
            />
            <CommandList onScroll={handleListScroll}>
              {isSearching && results.length === 0 && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}
              {!isSearching && results.length === 0 && (
                <CommandEmpty>
                  No matches. Try &quot;Add by URL&quot; below.
                </CommandEmpty>
              )}
              <CommandGroup>
                {results.map((c) => {
                  const selected = companies.some(
                    (sel) => sel.token === c.token,
                  );
                  return (
                    <CommandItem
                      key={c.token}
                      value={c.token}
                      disabled={!selected && atLimit}
                      onSelect={() => toggleCompany(c)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span>{c.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.token}
                      </span>
                      <a
                        href={companyBoardUrl(provider, c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${c.name} job board`}
                        title="Open job board"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {isSearching && results.length > 0 && (
                <div className="flex items-center justify-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more...
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {companies.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {companies.map((c) => (
            <Badge key={c.token} variant="secondary" className="gap-1">
              {c.name}
              <button type="button" onClick={() => onRemove(c.token)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <CompanyUrlAdd
        provider={provider}
        placeholder={meta.urlHint}
        disabled={atLimit}
        onResolved={onAdd}
      />
      <p className="text-sm text-muted-foreground">
        Select {meta.label} companies to monitor their job boards for new
        openings.
      </p>
    </div>
  );
}
