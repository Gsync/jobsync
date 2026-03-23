/** EURES member countries with ISO 3166-1 alpha-2 codes and English names. */
export interface EuresCountry {
  code: string;
  name: string;
}

export const EURES_COUNTRIES: EuresCountry[] = [
  { code: "at", name: "Austria" },
  { code: "be", name: "Belgium" },
  { code: "bg", name: "Bulgaria" },
  { code: "ch", name: "Switzerland" },
  { code: "cy", name: "Cyprus" },
  { code: "cz", name: "Czechia" },
  { code: "de", name: "Germany" },
  { code: "dk", name: "Denmark" },
  { code: "ee", name: "Estonia" },
  { code: "el", name: "Greece" },
  { code: "es", name: "Spain" },
  { code: "fi", name: "Finland" },
  { code: "fr", name: "France" },
  { code: "hr", name: "Croatia" },
  { code: "hu", name: "Hungary" },
  { code: "ie", name: "Ireland" },
  { code: "is", name: "Iceland" },
  { code: "it", name: "Italy" },
  { code: "li", name: "Liechtenstein" },
  { code: "lt", name: "Lithuania" },
  { code: "lu", name: "Luxembourg" },
  { code: "lv", name: "Latvia" },
  { code: "mt", name: "Malta" },
  { code: "nl", name: "Netherlands" },
  { code: "no", name: "Norway" },
  { code: "pl", name: "Poland" },
  { code: "pt", name: "Portugal" },
  { code: "ro", name: "Romania" },
  { code: "se", name: "Sweden" },
  { code: "si", name: "Slovenia" },
  { code: "sk", name: "Slovakia" },
];

/** Map code → country for O(1) lookup */
export const EURES_COUNTRY_MAP = new Map(
  EURES_COUNTRIES.map((c) => [c.code, c]),
);

/**
 * NUTS Level 1 region names (Eurostat NUTS 2024 classification).
 * Keys are lowercase NUTS codes as returned by the EURES API.
 */
export const NUTS_REGION_NAMES: Record<string, string> = {
  // Austria
  at1: "Ostösterreich",
  at2: "Südösterreich",
  at3: "Westösterreich",
  // Belgium
  be1: "Région de Bruxelles-Capitale",
  be2: "Vlaams Gewest",
  be3: "Région Wallonne",
  // Bulgaria
  bg3: "Severna i Yugoiztochna Bulgaria",
  bg4: "Yugozapadna i Yuzhna Tsentralna Bulgaria",
  // Switzerland
  ch0: "Schweiz / Suisse",
  // Cyprus
  cy0: "Kypros",
  // Czechia
  cz0: "Česko",
  // Germany
  de1: "Baden-Württemberg",
  de2: "Bayern",
  de3: "Berlin",
  de4: "Brandenburg",
  de5: "Bremen",
  de6: "Hamburg",
  de7: "Hessen",
  de8: "Mecklenburg-Vorpommern",
  de9: "Niedersachsen",
  dea: "Nordrhein-Westfalen",
  deb: "Rheinland-Pfalz",
  dec: "Saarland",
  ded: "Sachsen",
  dee: "Sachsen-Anhalt",
  def: "Schleswig-Holstein",
  deg: "Thüringen",
  // Denmark
  dk0: "Danmark",
  // Estonia
  ee0: "Eesti",
  // Greece
  el3: "Attiki",
  el4: "Nisia Aigaiou, Kriti",
  el5: "Voreia Ellada",
  el6: "Kentriki Ellada",
  // Spain
  es1: "Noroeste",
  es2: "Noreste",
  es3: "Comunidad de Madrid",
  es4: "Centro",
  es5: "Este",
  es6: "Sur",
  es7: "Canarias",
  // Finland
  fi1: "Manner-Suomi",
  fi2: "Åland",
  // France
  fr1: "Île-de-France",
  frb: "Centre — Val de Loire",
  frc: "Bourgogne — Franche-Comté",
  frd: "Normandie",
  fre: "Hauts-de-France",
  frf: "Grand Est",
  frg: "Pays de la Loire",
  frh: "Bretagne",
  fri: "Nouvelle-Aquitaine",
  frj: "Occitanie",
  frk: "Auvergne — Rhône-Alpes",
  frl: "Provence-Alpes-Côte d'Azur",
  frm: "Corse",
  fry: "Départements d'outre-mer",
  // Croatia
  hr0: "Hrvatska",
  // Hungary
  hu1: "Közép-Magyarország",
  hu2: "Dunántúl",
  hu3: "Alföld és Észak",
  // Iceland
  is0: "Ísland",
  // Ireland
  ie0: "Ireland",
  // Italy
  itc: "Nord-Ovest",
  itf: "Sud",
  itg: "Isole",
  ith: "Nord-Est",
  iti: "Centro",
  // Liechtenstein
  li0: "Liechtenstein",
  // Lithuania
  lt0: "Lietuva",
  // Luxembourg
  lu0: "Luxembourg",
  // Latvia
  lv0: "Latvija",
  // Malta
  mt0: "Malta",
  // Netherlands
  nl1: "Noord-Nederland",
  nl2: "Oost-Nederland",
  nl3: "West-Nederland",
  nl4: "Zuid-Nederland",
  // Norway
  no02: "Innlandet",
  no06: "Trøndelag",
  no07: "Nord-Norge",
  no08: "Oslo og Viken",
  no09: "Agder og Sør-Østlandet",
  no0a: "Vestlandet",
  no0b: "Svalbard og Jan Mayen",
  // Poland
  pl4: "Północno-Zachodni",
  pl6: "Północny",
  pl7: "Centralny",
  pl8: "Wschodni",
  pl9: "Makroregion Województwo Mazowieckie",
  pla: "Południowy",
  plb: "Południowo-Zachodni",
  // Portugal
  pt1: "Continente",
  pt2: "Região Autónoma dos Açores",
  pt3: "Região Autónoma da Madeira",
  // Romania
  ro1: "Macroregiunea Unu",
  ro2: "Macroregiunea Doi",
  ro3: "Macroregiunea Trei",
  ro4: "Macroregiunea Patru",
  // Sweden
  se1: "Östra Sverige",
  se2: "Södra Sverige",
  se3: "Norra Sverige",
  // Slovenia
  si0: "Slovenija",
  // Slovakia
  sk0: "Slovensko",
};

/** Resolve a NUTS code to a human-readable name. */
export function getNutsName(code: string): string | undefined {
  return NUTS_REGION_NAMES[code.toLowerCase()];
}

/**
 * Get display label for a location code.
 * Countries → name, NUTS regions → "CODE: Name", NS → "Not Specified (Country)".
 */
export function getLocationLabel(code: string): string {
  const lc = code.toLowerCase();
  const country = EURES_COUNTRY_MAP.get(lc);
  if (country) return country.name;

  if (lc === "ns") return "NS: Not Specified";

  // Country-specific NS (e.g., "de-ns")
  if (lc.endsWith("-ns")) {
    const parentCode = lc.slice(0, 2);
    const parent = EURES_COUNTRY_MAP.get(parentCode);
    if (parent) return `NS: Not Specified (${parent.name})`;
    return "NS: Not Specified";
  }

  // Check NUTS name lookup
  const nutsName = getNutsName(lc);
  if (nutsName) return `${code.toUpperCase()}: ${nutsName}`;

  // Fallback: show code with parent country
  const parentCode = lc.slice(0, 2);
  const parent = EURES_COUNTRY_MAP.get(parentCode);
  if (parent) return `${code.toUpperCase()} (${parent.name})`;
  return code.toUpperCase();
}

/** Extract the country code from any location code (e.g., "de1" → "de") */
export function getCountryCode(locationCode: string): string {
  // Greece uses "el" in EURES but "gr" for flags
  const code = locationCode.slice(0, 2).toLowerCase();
  return code === "el" ? "gr" : code;
}
