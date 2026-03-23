import { NextResponse } from "next/server";

const EURES_COUNTRY_STATS_URL =
  "https://europa.eu/eures/api/jv-searchengine/public/statistics/getCountryStats";
const EUROSTAT_NUTS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/codelist/ESTAT/GEO?format=JSON";

interface EuresEntry {
  label?: string;
  code?: string;
  jobs?: number;
  children?: EuresEntry[];
}

interface LocationNode {
  code: string;
  label: string;
  jobs: number;
  children: LocationNode[];
}

/** Fetch NUTS code → name mapping from Eurostat (official EU source of truth). */
async function fetchNutsNames(): Promise<Record<string, string>> {
  try {
    const res = await fetch(EUROSTAT_NUTS_URL, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const labels: Record<string, string> = data?.category?.label ?? {};
    // Normalize keys to lowercase for consistent lookup
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(labels)) {
      normalized[key.toLowerCase()] = value as string;
    }
    return normalized;
  } catch {
    return {};
  }
}

/**
 * Build NUTS2/3 sub-regions for a given NUTS1 region from the Eurostat names map.
 * E.g., for "de1" (Baden-Württemberg), finds "de11" (Stuttgart), "de12" (Karlsruhe), etc.
 * Then for "de11", finds "de111" (Stuttgart Stadtkreis), "de112" (Böblingen), etc.
 */
function buildSubRegions(
  nuts1Code: string,
  nutsNames: Record<string, string>,
): LocationNode[] {
  const nuts2: LocationNode[] = [];

  for (const [code, label] of Object.entries(nutsNames)) {
    // Match NUTS2 codes: parent is nuts1Code, code is exactly 1 char longer
    // (e.g., nuts1="de1" → nuts2="de11", "de12", etc.)
    if (
      code.length === nuts1Code.length + 1 &&
      code.startsWith(nuts1Code) &&
      code !== nuts1Code
    ) {
      // Find NUTS3 children of this NUTS2
      const nuts3: LocationNode[] = [];
      for (const [subCode, subLabel] of Object.entries(nutsNames)) {
        if (
          subCode.length === code.length + 1 &&
          subCode.startsWith(code) &&
          subCode !== code
        ) {
          nuts3.push({
            code: subCode,
            label: subLabel,
            jobs: 0,
            children: [],
          });
        }
      }
      nuts3.sort((a, b) => a.code.localeCompare(b.code));

      nuts2.push({
        code,
        label,
        jobs: 0,
        children: nuts3,
      });
    }
  }

  nuts2.sort((a, b) => a.code.localeCompare(b.code));
  return nuts2;
}

export async function GET(): Promise<NextResponse> {
  try {
    const [euresRes, nutsNames] = await Promise.all([
      fetch(EURES_COUNTRY_STATS_URL, { next: { revalidate: 3600 } }),
      fetchNutsNames(),
    ]);

    if (!euresRes.ok) {
      return NextResponse.json({ locations: [] });
    }

    const euresData: EuresEntry[] = await euresRes.json();

    // Merge EURES job stats with Eurostat NUTS names + sub-regions
    const locations: LocationNode[] = euresData.map((entry) => {
      const code = (entry.code ?? "").toLowerCase();
      const countryLabel =
        entry.label || nutsNames[code] || code.toUpperCase();

      const children: LocationNode[] = (entry.children ?? []).map((child) => {
        const childCode = (child.code ?? "").toLowerCase();

        if (childCode === "ns") {
          return {
            code: `${code}-ns`,
            label: "NS: Not Specified",
            jobs: child.jobs ?? 0,
            children: [],
          };
        }

        const childLabel = nutsNames[childCode] || childCode.toUpperCase();
        const subRegions = buildSubRegions(childCode, nutsNames);

        return {
          code: childCode,
          label: childLabel,
          jobs: child.jobs ?? 0,
          children: subRegions,
        };
      });

      return {
        code,
        label: countryLabel,
        jobs: entry.jobs ?? 0,
        children,
      };
    });

    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json({ locations: [] });
  }
}
