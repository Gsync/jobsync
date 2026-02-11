export interface JobSearchResult {
  title: string;
  company: string;
  location: string;
  url: string;
  snippet?: string;
}

export interface JobDetails {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedDate?: string;
  salary?: string;
}

export type ScraperError =
  | { type: "blocked"; reason: string }
  | { type: "rate_limited"; retryAfter?: number }
  | { type: "network"; message: string }
  | { type: "parse"; message: string };

export type ScraperResult<T> =
  | { success: true; data: T }
  | { success: false; error: ScraperError };

export interface ScraperService {
  readonly boardId: string;
  readonly boardName: string;
  search(
    keywords: string,
    location: string,
  ): Promise<ScraperResult<JobSearchResult[]>>;
  extract(url: string): Promise<ScraperResult<JobDetails>>;
  close(): Promise<void>;
}
