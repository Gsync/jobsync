export interface LinkedInSearch {
  id: string;
  name: string;
  url: string;
  keywords: string;
  location: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface LinkedInSearchResult {
  id: string;
  url: string;
  title: string;
  company: string;
  location: string;
  postedDate?: string;
}

export interface LinkedInSearchPage {
  results: LinkedInSearchResult[];
  nextStart: number | null;
}
