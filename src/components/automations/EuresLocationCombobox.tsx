"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { ChevronsUpDown, Loader2, HelpCircle } from "lucide-react";

import type { CreateAutomationInput } from "@/models/automation.schema";
import {
  EURES_COUNTRIES,
  EURES_COUNTRY_MAP,
  getLocationLabel,
  getCountryCode,
} from "@/lib/scraper/eures/countries";
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
import { ChipList } from "@/components/ui/chip-list";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { cn } from "@/lib/utils";
import Image from "next/image";

const MAX_LOCATIONS = 10;

interface LocationNode {
  code: string;
  displayName: string;
  jobs: number;
  isNS?: boolean;
  children: LocationNode[];
}

interface CountryWithRegions {
  code: string;
  name: string;
  jobs: number;
  regions: LocationNode[];
}

type EuresLocationComboboxProps = {
  field: ControllerRenderProps<CreateAutomationInput, "location">;
};

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const lc = code.toLowerCase();
  const isNS = lc === "ns" || lc.endsWith("-ns");
  const flagCode = getCountryCode(code);
  const [hasError, setHasError] = useState(false);

  if (isNS) {
    return <HelpCircle className={cn("shrink-0 text-muted-foreground", className)} />;
  }

  if (hasError) {
    return (
      <span
        className={cn("inline-block shrink-0 rounded-full bg-muted", className)}
        style={{ width: 16, height: 16 }}
      />
    );
  }

  return (
    <Image
      src={`/flags/${flagCode}.svg`}
      alt={flagCode}
      className={cn("inline-block shrink-0", className)}
      width={16}
      height={16}
      onError={() => setHasError(true)}
    />
  );
}

export function EuresLocationCombobox({ field }: EuresLocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [countries, setCountries] = useState<CountryWithRegions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(
    new Set(),
  );
  const fetchedRef = useRef(false);

  // Parse comma-separated codes from field value
  const selectedCodes = useMemo(() => {
    if (!field.value) return [];
    return field.value
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
  }, [field.value]);

  const isMaxReached = selectedCodes.length >= MAX_LOCATIONS;

  // Fetch country stats with NUTS regions on first open
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    setIsLoading(true);

    fetch("/api/eures/locations")
      .then((res) => res.json())
      .then((data) => {
        const locations = data.locations ?? [];

        // Recursively map API nodes to LocationNode
        interface ApiNode {
          code?: string;
          label?: string;
          jobs?: number;
          children?: ApiNode[];
        }

        function mapChildren(
          nodes: ApiNode[],
          parentCode: string,
        ): LocationNode[] {
          const nsNodes: LocationNode[] = [];
          const regularNodes: LocationNode[] = [];

          for (const child of nodes) {
            const childCode = (child.code ?? "").toLowerCase();
            if (!childCode || childCode === parentCode) continue;

            const isNS = childCode.endsWith("-ns");
            const displayName = child.label || childCode.toUpperCase();
            const subChildren = mapChildren(child.children ?? [], childCode);

            if (isNS) {
              nsNodes.push({
                code: childCode,
                displayName,
                jobs: child.jobs ?? 0,
                isNS: true,
                children: [],
              });
            } else {
              regularNodes.push({
                code: childCode,
                displayName: `${childCode.toUpperCase()}: ${displayName}`,
                jobs: child.jobs ?? 0,
                children: subChildren,
              });
            }
          }

          regularNodes.sort((a, b) => a.code.localeCompare(b.code));
          return [...regularNodes, ...nsNodes];
        }

        const mapped: CountryWithRegions[] = locations
          .map((entry: ApiNode) => {
            const code = (entry.code ?? "").toLowerCase();
            if (!EURES_COUNTRY_MAP.has(code)) return null;

            return {
              code,
              name: entry.label || code.toUpperCase(),
              jobs: entry.jobs ?? 0,
              regions: mapChildren(entry.children ?? [], code),
            };
          })
          .filter(Boolean) as CountryWithRegions[];

        mapped.sort((a, b) => a.name.localeCompare(b.name));
        setCountries(mapped);
      })
      .catch(() => {
        // Fallback to static country list without regions
        setCountries(
          EURES_COUNTRIES.map((c) => ({
            code: c.code,
            name: c.name,
            jobs: 0,
            regions: [],
          })),
        );
      })
      .finally(() => setIsLoading(false));
  }, [open]);

  // Recursively filter locations by search input (matches code AND resolved name)
  const filtered = useMemo(() => {
    if (!inputValue) return countries;
    const q = inputValue.toLowerCase();

    function filterNodes(nodes: LocationNode[]): LocationNode[] {
      return nodes
        .map((node) => {
          const matches =
            node.code.includes(q) ||
            node.displayName.toLowerCase().includes(q);
          const matchingChildren = filterNodes(node.children);
          if (matches) return node;
          if (matchingChildren.length > 0)
            return { ...node, children: matchingChildren };
          return null;
        })
        .filter(Boolean) as LocationNode[];
    }

    return countries
      .map((country) => {
        const countryMatches =
          country.name.toLowerCase().includes(q) || country.code.includes(q);
        const matchingRegions = filterNodes(country.regions);
        if (countryMatches) return country;
        if (matchingRegions.length > 0)
          return { ...country, regions: matchingRegions };
        return null;
      })
      .filter(Boolean) as CountryWithRegions[];
  }, [countries, inputValue]);

  const addCode = (code: string) => {
    if (selectedCodes.includes(code) || isMaxReached) return;
    const next = [...selectedCodes, code];
    field.onChange(next.join(","));
  };

  const removeCode = (code: string) => {
    const next = selectedCodes.filter((c) => c !== code);
    field.onChange(next.join(","));
  };

  const toggleExpand = (code: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  /** Recursively render location nodes at any depth */
  function renderLocationNodes(
    nodes: LocationNode[],
    depth: number,
  ): React.ReactNode[] {
    const indent = 8 + depth * 4; // pl-8, pl-12, pl-16, ...
    return nodes.flatMap((node) => {
      const isSelected = selectedCodes.includes(node.code);
      const hasChildren = node.children.length > 0;
      const isNodeExpanded =
        expandedCountries.has(node.code) || inputValue.length > 0;

      const items: React.ReactNode[] = [];

      items.push(
        <CommandItem
          key={node.code}
          onSelect={() => {
            if (hasChildren && !inputValue) {
              toggleExpand(node.code);
            } else {
              addCode(node.code);
            }
          }}
          disabled={isSelected}
          className={`flex items-center gap-2 pl-${indent}`}
          style={{ paddingLeft: `${indent * 0.25}rem` }}
        >
          {node.isNS ? (
            <HelpCircle className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <FlagIcon code={node.code} className="h-3 w-3" />
          )}
          <span className="flex-1 text-sm">{node.displayName}</span>
          {node.jobs > 0 && (
            <span className="text-xs text-muted-foreground">
              {node.jobs.toLocaleString()}
            </span>
          )}
          {hasChildren && !inputValue && (
            <span className="text-xs text-muted-foreground">
              {isNodeExpanded ? "▾" : "▸"}
            </span>
          )}
          {isSelected && (
            <span className="text-xs text-primary">✓</span>
          )}
        </CommandItem>,
      );

      if (isNodeExpanded && hasChildren) {
        items.push(...renderLocationNodes(node.children, depth + 1));
      }

      return items;
    });
  }

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
                ? `Max ${MAX_LOCATIONS} locations reached`
                : selectedCodes.length > 0
                  ? `${selectedCodes.length} location(s) selected`
                  : "Select countries or regions..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search countries or NUTS regions..."
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isLoading && filtered.length === 0 && (
                  <CommandEmpty>No locations found.</CommandEmpty>
                )}
                {!isLoading &&
                  filtered.map((country) => {
                    const isCountrySelected = selectedCodes.includes(
                      country.code,
                    );
                    const isExpanded =
                      expandedCountries.has(country.code) ||
                      inputValue.length > 0;
                    const hasRegions = country.regions.length > 0;

                    return (
                      <CommandGroup key={country.code}>
                        {/* Country header row */}
                        <CommandItem
                          onSelect={() => {
                            if (hasRegions && !inputValue) {
                              toggleExpand(country.code);
                            } else {
                              addCode(country.code);
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <FlagIcon
                            code={country.code}
                            className="h-4 w-4"
                          />
                          <span className="flex-1">{country.name}</span>
                          {country.jobs > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {country.jobs.toLocaleString()} jobs
                            </span>
                          )}
                          {hasRegions && !inputValue && (
                            <span className="text-xs text-muted-foreground">
                              {isExpanded ? "▾" : "▸"}
                            </span>
                          )}
                          {isCountrySelected && (
                            <span className="text-xs text-primary">
                              ✓
                            </span>
                          )}
                        </CommandItem>

                        {/* "All of {Country}" entry when expanded */}
                        {isExpanded && hasRegions && !isCountrySelected && (
                          <CommandItem
                            onSelect={() => addCode(country.code)}
                            className="flex items-center gap-2 pl-8"
                          >
                            <FlagIcon
                              code={country.code}
                              className="h-3 w-3"
                            />
                            <span className="text-sm">
                              All of {country.name}
                            </span>
                          </CommandItem>
                        )}

                        {/* NUTS sub-regions (recursive) */}
                        {isExpanded &&
                          renderLocationNodes(country.regions, 1)}
                      </CommandGroup>
                    );
                  })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <InfoTooltip>
          <p className="font-semibold mb-1">Country Codes</p>
          <p className="text-xs mb-2">
            ISO 3166-1 alpha-2 codes (e.g., DE for Germany, AT for Austria).
            Selects all job vacancies in that country.
          </p>
          <p className="font-semibold mb-1">NUTS Region Codes</p>
          <p className="text-xs mb-2">
            Nomenclature of Territorial Units for Statistics. Hierarchical
            codes for EU regions (e.g., DE1 = Baden-Württemberg). More
            specific than country codes.
          </p>
          <p className="font-semibold mb-1">NS: Not Specified</p>
          <p className="text-xs">
            Vacancies where the employer did not specify a region within the
            country.
          </p>
        </InfoTooltip>
      </div>

      {/* Selected location chips with flags */}
      <ChipList
        items={selectedCodes.map((code) => ({
          value: code,
          label: getLocationLabel(code),
          icon:
            code.endsWith("-ns") || code === "ns" ? (
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <FlagIcon code={code} className="h-3.5 w-3.5" />
            ),
        }))}
        onRemove={removeCode}
      />
    </div>
  );
}
