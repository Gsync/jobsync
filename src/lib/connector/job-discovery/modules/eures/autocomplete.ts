export const EURES_AUTOCOMPLETE_URL =
  "https://europa.eu/eures/api/autocomplete-repository-rest-api/public/v2.0/occupations";

export type EuresOccupationSuggestion = {
  frequency: number;
  language: string;
  suggest: string;
};

export type EuresAutocompleteResponse = {
  results: EuresOccupationSuggestion[];
};
